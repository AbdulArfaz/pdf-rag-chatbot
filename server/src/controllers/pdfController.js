import fs from "fs";
import crypto from "crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { qdrant, ai } from "../config/db.js";
import { createEmbedding } from "../services/embeddingService.js";

export const createCollection = async (req, res) => {
  try {

   const collections = await qdrant.getCollections();
   const exists = collections.collections.some(c => c.name === 'pdf-docs');

   if(!exists){
    await qdrant.createCollection("pdf-docs", {
     vectors: { size: 384, distance: "Cosine" },
    });
   }
    await qdrant.createPayloadIndex("pdf-docs", {
      field_name: "fileId",
      field_schema: "keyword",
      wait: true,
    })
    res.send("collection and index are created");
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
};

export const uploadAndQueryPDF = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    const userQuery = req.body.userQuery;
    const pointsToUpsert = [];
    const fileId = crypto.randomUUID();

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
      const cleanedText = parsed.text
        .replace(/\r?\n\r/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const chunks = await splitter.createDocuments([cleanedText]);

      for (const chunk of chunks) {
        const embeddings = await createEmbedding(chunk.pageContent);
        pointsToUpsert.push({
          id: crypto.randomUUID(),
          vector: embeddings,
          payload: {
            text: chunk.pageContent,
            fileId: fileId,
          },
        });
      }
    }

    await qdrant.upsert("pdf-docs", {
      wait: true,
      points: pointsToUpsert,
    });

    let bestMatch = "";
    if (userQuery) {
      const queryEmbedding = await createEmbedding(userQuery);
      const searchResults = await qdrant.query("pdf-docs", {
        query: queryEmbedding,
        with_payload: true,
        limit: 5,
        filter: {
          must: [{ key: "fileId", match: { value: fileId } }],
        },
      });

      if (searchResults.points && searchResults.points.length > 0) {
        bestMatch = searchResults.points
          .map((p) => p.payload?.text)
          .filter(Boolean)
          .join("\n\n---\n\n");
      }
    }

    const prompt = `You are a helpful assistant answering questions based on the provided document context.

Instructions:
1. Answer the question directly and concisely using ONLY the provided context.
2. If the context contains sufficient information, explain it briefly.
3. If the context does not contain enough information to answer the question, state that clearly instead of guessing.

Context:
${bestMatch}

User Question:
${userQuery}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    res.send(response.text);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing PDFs");
  }
};
