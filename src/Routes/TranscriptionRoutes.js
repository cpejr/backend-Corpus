import express from "express";
import TranscriptionController from "../Controllers/TranscriptionController.js";

const TranscriptionRoutes = express.Router();

TranscriptionRoutes.post("/", TranscriptionController.createTranscription);

TranscriptionRoutes.get("/", TranscriptionController.getTranscription);

TranscriptionRoutes.delete("/:id", TranscriptionController.deleteTranscription);

TranscriptionRoutes.put("/:id", TranscriptionController.updateTranscription);

export default TranscriptionRoutes;