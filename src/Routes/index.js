import express from "express";
import UserRoutes from "./UserRoutes.js";
import CategoryRoutes from "./CategoryRoutes.js";
import VideoRoutes from "./VideoRoutes.js";
import SessionRoutes from "./SessionRoutes.js";
import VideoFilterRoutes from "./VideoFilterRoutes.js";
import ArchiveRoutes from "./ArchivesRoutes.js";
import ManualTranscriptionArchiveRoutes from "./ManualTranscriptionRoutes.js";
import CountryRoutes from "./CountryRoutes.js";
import LanguageRoutes from "./LanguageRoutes.js";

import DownloadRoutes from "./DownloadRoutes.js";

const routes = express.Router();

routes.use("/", SessionRoutes);
routes.use("/user", UserRoutes);
routes.use("/category", CategoryRoutes);
routes.use("/video", VideoRoutes);
routes.use("/videofilter", VideoFilterRoutes);
routes.use("/archive", ArchiveRoutes);
routes.use("/manualTranscription", ManualTranscriptionArchiveRoutes);
routes.use("/country", CountryRoutes);
routes.use("/language", LanguageRoutes);
routes.use("/download", DownloadRoutes);

export default routes;
