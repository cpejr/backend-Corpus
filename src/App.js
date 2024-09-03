import express from "express";
import dotenv from "dotenv";
import routes from "./Routes/index.js";
import cors from "cors";
import corsOptions from "./Config/cors.js";
import bodyParser from "body-parser";
import cookieParser from 'cookie-parser';
import { NotFoundError } from "./Errors/baseErrors.js"; 

dotenv.config();
const app = express();
app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(routes);

//Non existing routes
app.use("*", (req, res, next) => {
   next(new NotFoundError(`Route '${req.baseUrl}' not found`));
});

//DESCOMENTAR AS PARTES DAS ROTAS QUANDO ELAS FOREM ACRESCENTADAS

export default app;
