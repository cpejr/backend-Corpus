import express from "express";
import ManualTranscriptionArchiveController from "../Controllers/ManualTranscriptionArchiveController";
const ManualTranscriptionArchiveRoutes = express.Router();

ManualTranscriptionArchiveRoutes.get("/:id", ManualTranscriptionArchiveController.getArchives);

export default ManualTranscriptionArchiveRoutes;
