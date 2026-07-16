import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-3.1-flash-lite";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set — add it to .env.local");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
