import express from "express";
import dotenv from "dotenv";
import routes from "./Routes/index.js";
import cors from "cors";
import corsOptions from "./Config/cors.js";

import cookieParser from "cookie-parser";
import { NotFoundError } from "./Errors/baseErrors.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(routes);
const transcriptsPath = path.join(__dirname, "persistent_storage", "transcripts");
app.use("/transcripts", express.static(transcriptsPath));
app.get("/favicon.ico", (req, res) => res.status(204).end());

export default app;
