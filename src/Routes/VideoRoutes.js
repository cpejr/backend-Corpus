import VideoValidator from "../Validators/VideoValidator.js";
import VideoController from "../Controllers/VideoController.js";
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";

const VideoRoutes = express.Router();

VideoRoutes.post(
  "/", //verifyJWT,
  //VideoValidator.create,
  VideoController.Create
);

VideoRoutes.get("/", VideoController.GetVideo);
VideoRoutes.put("/:id", VideoController.UpdateVideo);
VideoRoutes.delete("/:id", VideoController.Destroy);
VideoRoutes.get("/:data", VideoController.GetVideoByParameters);

export default VideoRoutes;
