import 'dotenv/config';
import express from "express";
import multer from "multer";
import fs from "fs";
import { extractText, getDocumentProxy } from 'unpdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenAI } from "@google/genai";
import { pipeline } from '@xenova/transformers';
import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';

const app = express();
const upload = multer({ dest: "uploads" });

app.get("/", (req, res) => {
  res.send("Hey I am working");
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QRANT_API_KEY
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


app.get('/pdf-store', async (req, res)=>{
  try {
     await qdrant.createCollection('pdf-docs', {
      vectors: {
        size: 384,
        distance: "Cosine",
      },     
     })
      res.send('collection is created')
  } catch (error) {
    console.log(error)
    res.status(500).send(error)
  }
})


app.post("/upload", upload.array("pdf"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    const userQuery = req.body.userQuery;
    const pointsToUpsert = [];

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
        pointsToUpsert.push({
          id: crypto.randomUUID(),
          vector: embeddings,
          payload: { text: chunk.pageContent }
        });
      }
    }
    await qdrant.upsert('pdf-docs', {
      wait: true,
      points: pointsToUpsert,
    })
     
    let bestMatch = "";
    if(userQuery){
        const queryEmbedding = await createEmbedding(userQuery);
        const searchResults = await qdrant.search('pdf-docs', {
          vector: queryEmbedding,
          limit: 1,
        })
        if(searchResults.length > 0){
          bestMatch = searchResults[0].payload.text;
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
    
