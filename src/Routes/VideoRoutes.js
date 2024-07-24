import VideoValidator from "../Validators/VideoValidator.js";
import VideoController from "../Controllers/VideoController.js";
import express from "express";

const VideoRoutes = express.Router();

VideoRoutes.post("/video", VideoValidator.insert, VideoController.InsertVideo);

VideoRoutes.get("/video", VideoController.GetVideo);

VideoRoutes.delete("/video/:id", VideoValidator.destroy, VideoController.DeleteVideo);


export default VideoRoutes;

