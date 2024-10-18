import VideoValidator from "../Validators/VideoValidator.js";
import VideoController from "../Controllers/VideoController.js";
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";

const VideoRoutes = express.Router();

VideoRoutes.post("/", verifyJWT, VideoValidator.insert, VideoController.Create);

VideoRoutes.get("/", VideoController.GetVideo);

VideoRoutes.delete("/:id", verifyJWT, VideoValidator.destroy, VideoController.Destroy);

export default VideoRoutes;
