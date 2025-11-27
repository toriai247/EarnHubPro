
export const generateAESKey = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

export const exportAESKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

export const importAESKey = async (base64Key: string): Promise<CryptoKey> => {
  const binary = atob(base64Key);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  
  return window.crypto.subtle.importKey(
    "raw",
    bytes,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptData = async (text: string, key: CryptoKey): Promise<string> => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoded
  );

  const ivBase64 = btoa(String.fromCharCode(...iv));
  const contentBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  
  return JSON.stringify({ iv: ivBase64, data: contentBase64 });
};

export const decryptData = async (encryptedJson: string, key: CryptoKey): Promise<string> => {
  try {
      const { iv, data } = JSON.parse(encryptedJson);
      
      const ivBinary = atob(iv);
      const ivBytes = new Uint8Array(ivBinary.length);
      for (let i = 0; i < ivBinary.length; i++) ivBytes[i] = ivBinary.charCodeAt(i);

      const dataBinary = atob(data);
      const dataBytes = new Uint8Array(dataBinary.length);
      for (let i = 0; i < dataBinary.length; i++) dataBytes[i] = dataBinary.charCodeAt(i);

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: ivBytes,
        },
        key,
        dataBytes
      );

      return new TextDecoder().decode(decrypted);
  } catch (e) {
      console.error("Decryption error:", e);
      throw new Error("Failed to decrypt data. Key mismatch or data corruption.");
  }
};
