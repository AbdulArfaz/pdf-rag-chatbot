import express from "express";
import multer from "multer";
import { createCollection, uploadAndQueryPDF } from '../controllers/pdfController.js';

const router = express.Router();
const upload = multer({ dest: "uploads" });

router.get('/pdf-store', createCollection);
router.post('/upload', upload.array("pdf"), uploadAndQueryPDF);

export default router;