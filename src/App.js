import express from "express";
import dotenv from "dotenv";
import routes from "./Routes/index.js";
import cors from "cors";
import corsOptions from "./Config/cors.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { NotFoundError } from "./Errors/baseErrors.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();

app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "10000mb", extended: true }));
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));


app.use(routes);
app.use('/transcripts', express.static(path.resolve('./src/persistent_storage/transcripts')));

app.get('/favicon.ico', (req, res) => res.status(204).end());

export default app;
