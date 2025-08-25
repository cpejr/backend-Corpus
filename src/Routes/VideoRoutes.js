import VideoValidator from "../Validators/VideoValidator.js";
import VideoController from "../Controllers/VideoController.js";
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";
import upload from "../Config/multer.js";

const VideoRoutes = express.Router();

VideoRoutes.post(
  "/",
  verifyJWT, //VideoValidator.create,
  upload.single("videoFile"),
  VideoController.Create
);

VideoRoutes.get("/", VideoController.GetVideo);
VideoRoutes.put(
  "/:id",
  verifyJWT,
  upload.single("ManualTranscriptionArchive"), // <-- aqui o nome do campo do arquivo
  VideoController.UpdateVideo
);

VideoRoutes.delete("/:id", VideoController.Destroy);

VideoRoutes.get("/vtt/:id", VideoController.getVTTUrl);

export default VideoRoutes;
