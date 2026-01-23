
import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig } from "../types";

// Fixed: Correctly importing and initializing GoogleGenAI following SDK guidelines
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini'
};

console.log("[GeminiService] Module loaded with Google GenAI SDK support");

export const analyzeImage = async (
  base64Image: string, 
  mimeType: string,
  config: AIConfig
): Promise<{ summary: string; labels: string[] }> => {
  
  console.log("[GeminiService] Analyzing image...");

  if (config.provider === 'gemini') {
    // Fix: Create a new instance right before the API call as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `Analyze this image for a cultural heritage manifest. Provide a professional summary and extract key archival labels. Return the response in JSON format.`
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'A professional archival summary of the image.'
            },
            labels: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key descriptive labels for categorization.'
            }
          },
          required: ["summary", "labels"],
          propertyOrdering: ["summary", "labels"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Received empty response from Gemini API");
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Gemini JSON Parse Error:", text);
      throw new Error("Invalid JSON format in Gemini response");
    }
  }

  if (config.provider === 'ollama') {
    try {
        console.log("[GeminiService] Attempting Ollama connection...");
        const response = await fetch(config.ollamaEndpoint || 'http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.ollamaModel || 'llava',
                prompt: `Analyze this image for a cultural heritage manifest. Return JSON: { "summary": string, "labels": string[] }`,
                images: [base64Image],
                stream: false,
                format: "json"
            })
        });
        if (!response.ok) throw new Error("Ollama connection failed.");
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return JSON.parse(data.response);
        } catch (parseError) {
            console.error("Ollama JSON Parse Error:", text);
            throw new Error("Invalid JSON from Ollama");
        }
    } catch (e) {
        console.error("Ollama Error:", e);
        throw e;
    }
  }

  // Fallback
  console.warn("[GeminiService] AI provider not configured.");
  
  await new Promise(resolve => setTimeout(resolve, 500));

  return { 
      summary: "AI analysis is not configured. Please select a provider in settings.", 
      labels: ["manual-entry-required"] 
  };
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
