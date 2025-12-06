import { GoogleGenAI } from "@google/genai";
import { GeminiResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Handles the logic to determine if the user wants an edit or a text response.
 * Uses gemini-2.5-flash-image which supports both editing and Q&A.
 */
export const generateEditOrResponse = async (
  imageBase64: string,
  prompt: string
): Promise<GeminiResponse> => {
  try {
    // Clean base64 string if it contains the header
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    
    // We determine the mime type from the header if possible, default to png
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    // Gemini 2.5 Flash Image is the go-to for image tasks (both editing and generation)
    // The model is smart enough to know if it should generate an image or text based on the prompt.
    // However, to ensure editing works, we pass the image as inlineData.
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      // We do not force schema, let the model decide if it returns text or image or both
    });

    const result: GeminiResponse = {};

    // Check for candidates
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.text) {
            result.text = (result.text || "") + part.text;
          }
          if (part.inlineData) {
            result.image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    // Fallback if no parts found in usual structure
    if (!result.text && !result.image && response.text) {
        result.text = response.text;
    }

    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};