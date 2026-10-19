import "dotenv/config";
import express from 'express';
import pdfRoutes from './src/routes/pdfRoutes.js';

const app = express();

app.get("/", (req, res) => {
  res.send("Hey I am working");
});

app.use("/",pdfRoutes);

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});
