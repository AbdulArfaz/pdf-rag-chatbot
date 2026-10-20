import "dotenv/config";
import cors from 'cors';
import express from 'express';
import pdfRoutes from './src/routes/pdfRoutes.js';

const app = express();

const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://pdf-rag-chatbot-wine.vercel.app" 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hey I am working");
});

app.use("/",pdfRoutes);

app.listen(3000, () => {
  console.log(`Server is running on port ${PORT}`);
});
