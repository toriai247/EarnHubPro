
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 1. Analyze Deposit Screenshot (With Time Guard) ---
export const analyzeDepositScreenshot = async (
  imageUrl: string, 
  claimedAmount: number, 
  claimedTrx: string,
  method: string,
  sessionStartTime?: string // ISO String of when "Start Payment" was clicked
) => {
  try {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const base64String = base64Data as string;

    const model = "gemini-2.5-flash";
    
    // Strict Time Logic Prompt
    let timePrompt = "";
    if (sessionStartTime) {
        const startDate = new Date(sessionStartTime);
        
        // We pass the local time string to help the AI understand context better
        timePrompt = `
        CRITICAL SECURITY RULE (TIME WINDOW):
        The user started the payment session at: ${startDate.toISOString()} (Server Time).
        The valid payment window is exactly 10 minutes.
        
        INSTRUCTIONS:
        1. Scan the image for any time/date.
        2. Convert the found time to a standard format.
        3. Compare the found time with the Session Start Time (${startDate.toLocaleTimeString()}).
        4. IF the screenshot time is OLDER than the session start time -> REJECT (Old screenshot).
        5. IF the screenshot time is > 10 minutes AFTER start time -> REJECT (Expired).
        `;
    }

    const prompt = `
      You are a Strict Auto-Deposit Verification Bot. Analyze this payment screenshot.
      
      User Claims:
      - Amount: ${claimedAmount}
      - Transaction ID (TrxID): ${claimedTrx}
      - Method: ${method}
      
      ${timePrompt}

      Task:
      1. OCR the Transaction ID (TrxID) and Amount from the image.
      2. Compare extracted data with User Claims.
      3. Verify the Time Window based on the CRITICAL SECURITY RULE above.
      4. Check for fake/edited screenshots (font mismatches, blur).

      Return ONLY a JSON object:
      {
        "status": "match" | "mismatch" | "suspicious" | "unclear",
        "found_trx": "string or null",
        "found_amount": "number or null",
        "found_time": "string or null",
        "confidence": number (0-100),
        "reason": "Clear explanation of why it matched or failed. If time mismatch, explicitly state it."
      }
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: base64String } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.text || "{}");

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { status: "error", reason: "Failed to analyze image." };
  }
};

// --- 2. Analyze KYC Documents ---
export const analyzeKYCDocuments = async (
  frontUrl: string, 
  backUrl: string, 
  userName: string
) => {
  try {
    const getBase64 = async (url: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });
    }

    const frontB64 = await getBase64(frontUrl);
    const backB64 = await getBase64(backUrl);

    const prompt = `
      You are an Identity Verification AI. 
      Target Name: "${userName}"

      Analyze these two ID card images (Front and Back).
      1. Extract the name from the ID card.
      2. Compare extracted name with Target Name (allow minor spelling differences).
      3. Check for signs of digital manipulation (photoshop).
      4. Verify it looks like a valid government ID.

      Return ONLY JSON:
      {
        "is_valid": boolean,
        "name_match": boolean,
        "extracted_name": "string",
        "document_type": "string",
        "risk_score": number (0-100, where 100 is high risk),
        "notes": "string"
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: frontB64 } },
            { inlineData: { mimeType: "image/jpeg", data: backB64 } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.text || "{}");

  } catch (error) {
    console.error("KYC AI Error:", error);
    return { is_valid: false, notes: "AI Analysis failed." };
  }
};

// --- 3. Analyze Task Proof (Micro Jobs) ---
export const analyzeTaskProof = async (
    taskTitle: string,
    taskDescription: string,
    proofData: string, // Text or URL
    proofType: 'text' | 'screenshot' | 'auto'
) => {
    try {
        const model = "gemini-2.5-flash";
        let parts: any[] = [];

        // Construct Prompt
        const basePrompt = `
            You are a Micro-Job Verification AI. Your job is to prevent fraud.
            
            Task Context:
            - Title: "${taskTitle}"
            - Instructions: "${taskDescription}"
            - Expected Proof Type: ${proofType}

            User Submission: "${proofData}"

            Evaluate if the user's submission is valid proof that they completed the task.
            
            Rules:
            1. If proof is just "done", "ok", or gibberish, REJECT it immediately.
            2. If task asks for a Username, ensure the submission looks like a username.
            3. If task asks for a Code, ensure submission looks like a code.
            4. If proof is a URL to an image, analyze the image context (e.g. if task is YouTube, image must look like YouTube, if Task is Facebook, image must show Facebook).

            Return JSON:
            {
                "verdict": "approved" | "rejected" | "manual_review",
                "confidence": number (0-100),
                "reason": "Short reason for decision"
            }
        `;

        parts.push({ text: basePrompt });

        // If proof is an image URL, fetch it
        if (proofType === 'screenshot' && proofData.startsWith('http')) {
            try {
                const response = await fetch(proofData);
                const blob = await response.blob();
                const base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
                parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
            } catch (e) {
                return { verdict: "manual_review", confidence: 0, reason: "Could not download proof image for AI analysis." };
            }
        }

        const result = await ai.models.generateContent({
            model: model,
            contents: [{ role: "user", parts: parts }],
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(result.text || "{}");

    } catch (error) {
        console.error("Task AI Error:", error);
        return { verdict: "manual_review", confidence: 0, reason: "AI Service Unavailable" };
    }
};

// --- 4. User Risk Analysis (Activity Watchdog) ---
export const analyzeUserRisk = async (
  userProfile: any,
  recentTransactions: any[],
  gameHistory: any[]
) => {
  try {
    const model = "gemini-2.5-flash";

    // Summarize data for prompt
    const depositTotal = recentTransactions
      .filter(t => t.type === 'deposit' && t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const withdrawTotal = recentTransactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);

    const gamesPlayed = gameHistory.length;
    const gamesWon = gameHistory.filter(g => g.profit > 0).length;
    const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

    // We send concise JSON data to save context window
    const prompt = `
      You are the Risk Analysis AI for Naxxivo.
      Analyze this user's activity for fraud, exploits, or abuse.

      User ID: ${userProfile.id}
      Created: ${userProfile.created_at}
      
      Financial Summary:
      - Total Deposits: $${depositTotal}
      - Total Withdrawals: $${withdrawTotal}
      - Transactions Sample: ${JSON.stringify(recentTransactions.slice(0, 5).map(t => ({ t: t.type, a: t.amount, s: t.status })))}

      Game Activity:
      - Games Played: ${gamesPlayed}
      - Win Rate: ${winRate.toFixed(1)}%
      - History Sample: ${JSON.stringify(gameHistory.slice(0, 5).map(g => ({ g: g.gameName, p: g.profit })))}

      Rules for Suspension (Verdict 'suspend'):
      1. Win Rate > 90% with > 10 games played (Possible game exploit/cheat).
      2. Withdrawals > Deposits * 5 without significant recorded gameplay wins (Money laundering risk).
      3. Creating account and immediately attempting high value withdrawals without activity.

      Rules for Warning (Verdict 'flag'):
      1. Win Rate > 75%.
      2. Withdrawals > Deposits.

      Return JSON:
      {
        "risk_score": number (0-100),
        "verdict": "suspend" | "flag" | "safe",
        "reason": "Explain detection reason."
      }
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.text || "{}");

  } catch (error) {
    console.error("Risk AI Error:", error);
    return { risk_score: 0, verdict: "error", reason: "Analysis failed" };
  }
};
