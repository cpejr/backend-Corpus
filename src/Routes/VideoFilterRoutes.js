import VideoController from "../Controllers/VideoController.js";
import express from "express";

const VideoFilterRoutes = express.Router();

// Usar POST em vez de GET para filtros complexos
VideoFilterRoutes.post("/", VideoController.GetVideoByParameters);  // Alterado para POST

export default VideoFilterRoutes;
