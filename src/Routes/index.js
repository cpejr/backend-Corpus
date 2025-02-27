import UserRoutes from "./UserRoutes.js";
import CategoryRoutes from "./CategoryRoutes.js";
import VideoRoutes from "./VideoRoutes.js";
import SessionRoutes from "./SessionRoutes.js";
import VideoFilterRoutes from "./VideoFilterRoutes.js";
import ArchiveRoutes from "./ArchivesRoutes.js";
import express from "express";

const routes = express.Router();

routes.use("/", SessionRoutes);
routes.use("/user", UserRoutes);
routes.use("/category", CategoryRoutes);
routes.use("/video", VideoRoutes);
routes.use("/videofilter", VideoFilterRoutes);
routes.use("/archive",ArchiveRoutes)
export default routes;
