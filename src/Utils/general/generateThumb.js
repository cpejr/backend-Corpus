import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs/promises";
import path from "path";

export async function generateThumb(inputPath) {
  const tempDir = path.join("./src/Utils/database");
  const tempFilePath = path.join(tempDir, "thumb.webp");

  try {
    ffmpeg.setFfmpegPath(ffmpegStatic);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .takeScreenshots({
          count: 1,
          timemarks: ["2"], // Pega o frame aos 2 segundos
          filename: "thumb.webp",
          folder: tempDir,
        })
        .on("end", resolve)
        .on("error", reject);
    });

    const thumbnailBuffer = await fs.readFile(tempFilePath);

    await fs.unlink(tempFilePath);

    return thumbnailBuffer;
  } catch (error) {
    console.error("Erro ao gerar a thumbnail:", error);

    await fs.unlink(tempFilePath).catch(() => {});
    return null;
  }
}
