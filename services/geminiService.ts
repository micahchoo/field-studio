
import { GoogleGenAI } from "@google/genai";
import { AIConfig } from "../types";

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'none'
};

export const analyzeImage = async (
  base64Image: string, 
  mimeType: string,
  config: AIConfig
): Promise<{ summary: string; labels: string[] }> => {
  
  if (config.provider === 'none') {
    return { summary: "Local analysis: No AI provider.", labels: ["archive"] };
  }

  if (config.provider === 'ollama') {
    try {
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
        const data = await response.json();
        return JSON.parse(data.response);
    } catch (e) {
        console.error("Ollama Error:", e);
        throw e;
    }
  }

  if (config.provider === 'gemini') {
    try {
      // Lazy init to avoid top-level crashes and ensure environment readiness
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
          throw new Error("process.env.API_KEY is not defined");
      }
      const ai = new GoogleGenAI({ apiKey });

      // Using gemini-3-flash-preview for speed and multimodal capability as per guidelines
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: "Analyze this image for a IIIF manifest. Return valid JSON only: { \"summary\": \"string\", \"labels\": [\"string\"] }" }
          ]
        },
        config: {
            responseMimeType: "application/json",
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  }

  throw new Error("Invalid Provider");
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
