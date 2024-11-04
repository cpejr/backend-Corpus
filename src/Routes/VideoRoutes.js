import VideoValidator from "../Validators/VideoValidator.js";
import VideoController from "../Controllers/VideoController.js";
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";

const VideoRoutes = express.Router();

//VideoRoutes.post("/", verifyJWT, VideoValidator.create, VideoController.Create);
VideoRoutes.post("/", VideoValidator.create, VideoController.Create);

VideoRoutes.get("/", VideoController.GetVideo);

VideoRoutes.delete("/:id", verifyJWT, VideoValidator.destroy, VideoController.Destroy);

export default VideoRoutes;
