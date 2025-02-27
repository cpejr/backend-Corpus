import ArchivesController from "../Controllers/ArchivesController.js"
import express from "express";
const ArchiveRoutes = express.Router();


ArchiveRoutes.get("/:id", ArchivesController.getArchives);

export default ArchiveRoutes