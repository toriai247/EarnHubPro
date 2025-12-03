
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// Default Key provided by configuration
const DEFAULT_KEY = "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";

// Helper to get API Key
const getApiKey = () => {
  // 1. Check for Admin-configured key in Local Storage
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('deepseek_api_key') : null;
  
  // 2. Safe Env Access (Vite)
  let envKey = null;
  try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
          // @ts-ignore
          envKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      }
  } catch (e) {}

  // 3. Fallback to Default
  const apiKey = customKey || envKey || DEFAULT_KEY;

  if (!apiKey) {
    console.error("DeepSeek API Key is missing");
  }
  return apiKey;
};

// --- Generic DeepSeek Call Helper ---
const callDeepSeek = async (messages: any[], jsonMode = false, model = "deepseek-chat") => {
    const apiKey = getApiKey();
    
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                response_format: jsonMode ? { type: "json_object" } : undefined,
                stream: false,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `DeepSeek API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error: any) {
        console.error("DeepSeek Request Failed:", error);
        throw error;
    }
};

// --- Test Connection & Validate Key ---
export const validateDeepSeekKey = async (key: string) => {
    try {
        const start = performance.now();
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 5
            })
        });
        const end = performance.now();

        if (!response.ok) throw new Error("Invalid API Key");

        return { 
            valid: true, 
            latency: Math.round(end - start),
            message: "Connected Successfully"
        };
    } catch (error: any) {
        return { valid: false, latency: 0, message: error.message || "Connection Failed" };
    }
};

// --- Chat Helper ---
export const chatWithAI = async (userMessage: string, systemContext: string) => {
    const messages = [
        { role: "system", content: systemContext },
        { role: "user", content: userMessage }
    ];
    return await callDeepSeek(messages, false);
};

// --- Public Context for Chatbot ---
export const NAXXIVO_PUBLIC_CONTEXT = `
You are Nova, the AI Assistant for Naxxivo.
Naxxivo is a next-gen earning platform offering Investment Plans, Daily Tasks, Micro-Jobs, and Real-Time Gaming (Crash, Ludo, Spin, Dice).
Your role is to help users navigate the platform, explain how to earn money, and troubleshoot basic issues.

Key Information:
- Earning: Users earn by completing tasks, investing in plans (daily ROI), inviting friends (referral bonus), or winning games.
- Wallet: There are multiple wallets (Main, Game, Deposit, etc.). Funds must be in the correct wallet to be used.
- Withdrawals: Processed manually within 24 hours. Verification (KYC) might be required.
- Support: For account-specific issues (e.g. missing deposit), direct them to the Support Ticket system in the app.

Tone: Friendly, professional, and encouraging. Keep responses concise.
Do not provide financial advice. Do not ask for passwords or private keys.
`;

// --- 1. Analyze Deposit Screenshot (With Time Guard) ---
export const analyzeDepositScreenshot = async (
  imageUrl: string, 
  claimedAmount: number, 
  claimedTrx: string,
  method: string,
  sessionStartTime?: string
) => {
  try {
    let timePrompt = "";
    if (sessionStartTime) {
        const startDate = new Date(sessionStartTime);
        timePrompt = `
        CRITICAL SECURITY RULE (TIME WINDOW):
        The user started the payment session at: ${startDate.toISOString()} (Server Time).
        The valid payment window is exactly 10 minutes.
        INSTRUCTIONS:
        1. Scan the image for any time/date.
        2. Convert the found time to a standard format.
        3. Compare the found time with the Session Start Time.
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
        "confidence": number (0-100),
        "reason": "Clear explanation of why it matched or failed."
      }
    `;

    const messages = [
        {
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        }
    ];

    const result = await callDeepSeek(messages, true);
    return JSON.parse(result || "{}");

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { status: "error", reason: "DeepSeek Vision Analysis Failed. Manual Review Required." };
  }
};

// --- 2. Analyze KYC Documents ---
export const analyzeKYCDocuments = async (
  frontUrl: string, 
  backUrl: string, 
  userName: string
) => {
  try {
    const prompt = `
      You are an Identity Verification AI. 
      Target Name: "${userName}"

      Analyze these two ID card images.
      1. Extract the name from the ID card.
      2. Compare extracted name with Target Name (allow minor spelling differences).
      3. Check for signs of digital manipulation.
      4. Verify it looks like a valid government ID.

      Return ONLY JSON:
      {
        "is_valid": boolean,
        "name_match": boolean,
        "extracted_name": "string",
        "document_type": "string",
        "risk_score": number (0-100),
        "notes": "string"
      }
    `;

    const messages = [
        {
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: frontUrl } },
                { type: "image_url", image_url: { url: backUrl } }
            ]
        }
    ];

    const result = await callDeepSeek(messages, true);
    return JSON.parse(result || "{}");

  } catch (error) {
    console.error("KYC AI Error:", error);
    return { is_valid: false, notes: "DeepSeek Analysis failed." };
  }
};

// --- 3. CREATE TASK REFERENCE (CREATOR PHASE) ---
export const analyzeTaskReference = async (imageUrl: string, category: string) => {
    try {
        let specificPrompt = "";
        switch (category) {
            case 'youtube': 
            case 'video':
                specificPrompt = "Identify if the 'Subscribe' button is active or grayed out (Subscribed). Extract the Channel Name and Subscriber Count. Check for 'Liked' status.";
                break;
            case 'social':
                specificPrompt = "Look for 'Follow', 'Following', or 'Liked' indicators. Extract the profile username.";
                break;
            case 'app':
                specificPrompt = "Identify the main UI elements, header text, and prominent button colors.";
                break;
            default:
                specificPrompt = "Extract all visible text and dominant colors.";
        }

        const prompt = `
            You are analyzing a reference image for a micro-task campaign.
            Category: ${category}
            
            ${specificPrompt}

            Your Goal:
            1. Create a "Visual DNA" summary of key features (text, colors, status) that a worker's proof must match.
            2. Generate a Verification Quiz Question based on visual details (e.g. "What is the color of the X button?", "What number is visible next to Y?").

            Return ONLY JSON:
            {
                "visual_dna": {
                    "required_text": ["list", "of", "strings"],
                    "required_status": "string (e.g. Subscribed)",
                    "dominant_colors": ["color1", "color2"],
                    "key_objects": ["list", "of", "objects"]
                },
                "quiz": {
                    "question": "The question string",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_index": 0
                }
            }
        `;

        const messages = [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: imageUrl } }
                ]
            }
        ];

        const result = await callDeepSeek(messages, true);
        return JSON.parse(result || "{}");

    } catch (error) {
        console.error("Task Ref Analysis Error:", error);
        return {
            visual_dna: {},
            quiz: {
                question: "What is the primary color of the app logo?",
                options: ["Red", "Blue", "Green", "Yellow"],
                correct_index: 1
            }
        };
    }
};

// --- 4. VERIFY WORKER SUBMISSION (WORKER PHASE) ---
export const verifyTaskSubmission = async (workerImageUrl: string, referenceDNA: any) => {
    try {
        const prompt = `
            You are an AI Task Verifier.
            
            Compare the provided Worker Screenshot against this Reference DNA:
            ${JSON.stringify(referenceDNA)}

            Verification Rules:
            1. Does the image contain the 'required_text'?
            2. Does it show the 'required_status' (e.g. Subscribed)?
            3. Do the colors and objects match the reference DNA?
            
            Return ONLY JSON:
            {
                "match": boolean,
                "confidence": number (0-100),
                "reason": "Why it matched or failed"
            }
        `;

        const messages = [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: workerImageUrl } }
                ]
            }
        ];

        const result = await callDeepSeek(messages, true);
        return JSON.parse(result || "{}");

    } catch (error) {
        console.error("Submission Verify Error:", error);
        return { match: false, confidence: 0, reason: "AI Verification Failed" };
    }
};

// --- 5. User Risk Analysis (Activity Watchdog) ---
export const analyzeUserRisk = async (
  userProfile: any,
  recentTransactions: any[],
  gameHistory: any[]
) => {
  try {
    const depositTotal = recentTransactions
      .filter(t => t.type === 'deposit' && t.status === 'success')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const withdrawTotal = recentTransactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + t.amount, 0);

    const gamesPlayed = gameHistory.length;
    const gamesWon = gameHistory.filter(g => g.profit > 0).length;
    const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

    const prompt = `
      You are the Risk Analysis AI for Naxxivo. Analyze user activity for fraud.
      
      User ID: ${userProfile.id}
      Created: ${userProfile.created_at}
      Financials: Deposits $${depositTotal}, Withdrawals $${withdrawTotal}
      Game Stats: ${gamesPlayed} played, ${winRate.toFixed(1)}% Win Rate.
      
      Rules:
      1. Win Rate > 90% with > 10 games = Suspend (Cheat).
      2. Withdrawals > Deposits * 5 without wins = Suspend (Laundering).
      3. New account high withdrawal = Flag.

      Return JSON:
      {
        "risk_score": number (0-100),
        "verdict": "suspend" | "flag" | "safe",
        "reason": "Explain detection reason."
      }
    `;

    const result = await callDeepSeek([{ role: "user", content: prompt }], true);
    return JSON.parse(result || "{}");

  } catch (error) {
    console.error("Risk AI Error:", error);
    return { risk_score: 0, verdict: "error", reason: "Analysis failed" };
  }
};
