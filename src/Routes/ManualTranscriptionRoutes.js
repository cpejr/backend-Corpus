import express from "express";
import ManualTranscriptionArchiveController from "../Controllers/ManualTranscriptionArchiveController.js";
const ManualTranscriptionArchiveRoutes = express.Router();

ManualTranscriptionArchiveRoutes.get("/:id", ManualTranscriptionArchiveController.getArchives);

export default ManualTranscriptionArchiveRoutes;
