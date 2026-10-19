import "dotenv/config";
import cors from 'cors';
import express from 'express';
import pdfRoutes from './src/routes/pdfRoutes.js';

const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hey I am working");
});

app.use("/",pdfRoutes);

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});
