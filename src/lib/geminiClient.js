import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Gemini API Key is missing in .env file");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// ✅ FIX: Use the generic alias. 
// This automatically finds the correct Free Tier model for your key.
export const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });