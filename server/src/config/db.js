import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});