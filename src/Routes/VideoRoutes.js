import VideoController from "../Controllers/VideoController.js"; 
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";

const VideoRoutes = express.Router();


VideoRoutes.post("/",verifyJWT, /*VideoValidator.create*/ VideoController.Create);


VideoRoutes.post("/:data", VideoController.GetVideoByParameters); 


VideoRoutes.get("/", VideoController.GetVideo);  

VideoRoutes.put("/:id", VideoController.UpdateVideo);
VideoRoutes.delete("/:id", VideoController.Destroy);

export default VideoRoutes;
