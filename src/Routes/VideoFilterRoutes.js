import VideoController from "../Controllers/VideoController.js";
import express from "express";

const VideoFilterRoutes = express.Router();


VideoFilterRoutes.post("/", VideoController.GetVideoByParameters); 

export default VideoFilterRoutes;
