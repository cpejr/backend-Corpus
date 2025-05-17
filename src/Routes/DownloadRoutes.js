import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { custom } from "zod";

const DownloadRoutes = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

DownloadRoutes.get("/download/transcript/:filename", (req, res) => {
  const filename = req.params.filename;
  const safeTitle = filename
    ? filename.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
    : "transcricao";

  const transcriptPath = path.join(__dirname, "../persistent_storage/transcripts", safeTitle);

  if (!fs.existsSync(transcriptPath)) {
    console.error(`Arquivo não encontrado: ${transcriptPath}`);
    return res.status(404).json({
      message: "Arquivo não encontrado",
      attemptedPath: transcriptPath,
    });
  }

  res.download(transcriptPath, filename, (err) => {
    if (err) {
      console.error("Erro ao baixar arquivo:", err);
      res.status(500).send("Erro ao baixar o arquivo");
    }
  });
});

export default DownloadRoutes;
