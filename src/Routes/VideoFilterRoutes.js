import VideoController from "../Controllers/VideoController.js";
import express from "express";

const VideoFilterRoutes = express.Router();

VideoFilterRoutes.get("/", VideoController.GetVideoByParameters);

export default VideoFilterRoutes;
