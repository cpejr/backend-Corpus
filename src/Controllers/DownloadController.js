import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DownloadController {
  async downloadTranscript(req, res) {
    try {
      const filename = req.params.filename;
      const safeTitle = filename
        ? filename.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
        : "transcricao";

      const transcriptPath = path.join(__dirname, "../persistent_storage/transcripts", safeTitle);

      try {
        await fs.promises.access(transcriptPath, fs.constants.F_OK);
      } catch (error) {
        console.error("File not found:", transcriptPath);
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(safeTitle)}"`
      );

      const fileStream = fs.createReadStream(transcriptPath);

      fileStream.on("error", (error) => {
        console.error("File stream error:", error);
        res.status(500).json({ error: "Error reading file" });
      });

      fileStream.pipe(res);
    } catch (error) {
      console.error("Download controller error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new DownloadController();
