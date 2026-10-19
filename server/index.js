import 'dotenv/config';
import express from "express";
import multer from "multer";
import fs from "fs";
import { extractText, getDocumentProxy } from 'unpdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenAI } from "@google/genai";
import { pipeline } from '@xenova/transformers';

const app = express();
const upload = multer({ dest: "uploads" });

app.get("/", (req, res) => {
  res.send("Hey I am working");
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})

// Load a lightweight, fast local embedding model once when server starts
let embedder = null;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

async function createEmbedding(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// Global array to hold embeddings across all uploads
const globalChunkEmbeddings = [];

app.post("/upload", upload.array("pdf"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    const userQuery = req.body.userQuery;

    // Loop through each uploaded PDF file
    for (const file of req.files) {
      const fileBuffer = fs.readFileSync(file.path);
      const dataArray = new Uint8Array(fileBuffer);
      const pdfDoc = await getDocumentProxy(dataArray);
      const parsed = await extractText(pdfDoc, { mergePages: true });

      fs.unlinkSync(file.path);

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 200,
      });
      const cleanedText = parsed.text.replace(/\r?\n\r/g, " ").replace(/\s+/g, " ").trim();
      const chunks = await splitter.createDocuments([cleanedText]);

      for (const chunk of chunks) {
        const embeddings = await createEmbedding(chunk.pageContent);
        globalChunkEmbeddings.push({
          text: chunk.pageContent,
          embeddings
        });
      }
    }

    const queryEmbedding = await createEmbedding(userQuery);
    let bestMatch = null;
    let highestScore = -1;

    for (const item of globalChunkEmbeddings) {
      const score = cosineSimilarity(queryEmbedding, item.embeddings);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item.text;
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `Answer the question using the context: ${bestMatch}\n\nQuestion: ${userQuery}`
    });

    res.send(response.text);

  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing PDFs");
  }
});
    
app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
    });
    
