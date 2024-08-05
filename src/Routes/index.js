import UserRoutes from './UserRoutes.js';
import CategoryRoutes from './CategoryRoutes.js';
import VideoRoutes from './VideoRoutes.js';
import express from "express";

const routes = express.Router();

routes.use("/user", UserRoutes);
routes.use("/category", CategoryRoutes);
routes.use("/video", VideoRoutes);

export default routes;
