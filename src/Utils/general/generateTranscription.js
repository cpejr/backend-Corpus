import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import PDFDocument from "pdfkit";
import { convertSRTtoVTT } from "./convertSrtToVtt.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const speechClient = new SpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});
const storageClient = new Storage({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

const languageMap = {
  portugues: "pt-BR",
  pt: "pt-BR",
  "pt-br": "pt-BR",
  ingles: "en-US",
  inglês: "en-US",
  english: "en-US",
  espanhol: "es-ES",
  español: "es-ES",
  frances: "fr-FR",
  francés: "fr-FR",
  fr: "fr-FR",
  alemao: "de-DE",
  alemán: "de-DE",
  italiano: "it-IT",
  italian: "it-IT",
};

function normalizeLanguageCode(language) {
  if (!language) return "en-US";

  const normalized = language
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  return languageMap[normalized] || "en-US";
}

async function extractAudio(videoPath, outputFormat = "flac") {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  return new Promise((resolve, reject) => {
    const absoluteVideoPath = path.resolve(videoPath);
    const audioPath = absoluteVideoPath.replace(/\.[^/.]+$/, `.${outputFormat}`);

    ffmpeg(absoluteVideoPath)
      .setFfmpegPath(ffmpegStatic)
      .output(audioPath)
      .noVideo()
      .audioCodec("flac")
      .audioChannels(1)
      .audioFrequency(16000)
      .on("end", () => resolve(audioPath))
      .on("error", reject)
      .run();
  });
}

async function uploadToBucket(filePath, bucketName) {
  try {
    const destination = path.basename(filePath);
    await storageClient.bucket(bucketName).upload(filePath, {
      destination,
      resumable: false,
    });
    return `gs://${bucketName}/${destination}`;
  } catch (error) {
    throw new Error(`Bucket upload failed: ${error.message}`);
  }
}

async function saveTranscriptToFile(transcription, videoPath, languageCode, title) {
  const transcriptsDir = path.join(__dirname, "../../persistent_storage/transcripts");

  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  const safeTitle = title
    ? title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
    : "transcricao";

  const transcriptPath = path.join(transcriptsDir, `${safeTitle}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(transcriptPath);
  doc.pipe(writeStream);

  doc.fontSize(16).text(`Transcrição: ${safeTitle}`, { align: "left" });
  doc.moveDown();
  doc.fontSize(12).text(`Gerada em: ${new Date().toLocaleString()}`);
  doc.text(`Idioma: ${languageCode}`);
  doc.moveDown().text("----------------------------------------");
  doc.moveDown().fontSize(12).text(transcription, { align: "left" });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(transcriptPath));
    writeStream.on("error", reject);
  });
}
async function saveSRTFile(subtitles, title) {
  const transcriptsDir = path.join(__dirname, "../../persistent_storage/transcripts");

  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  const safeTitle = title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "");
  const srtPath = path.join(transcriptsDir, `${safeTitle}.srt`);

  await fs.promises.writeFile(srtPath, subtitles.join("\n"), "utf8");

  return srtPath;
}

export async function generateTranscription(videoPath, language = "en-US", title) {
  let audioPath;

  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error("Invalid video path");
    }
    const safeTitle = title
      ? title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
      : "transcricao";

    const languageCode = normalizeLanguageCode(language);

    audioPath = await extractAudio(videoPath);

    const cloudStorageUri = await uploadToBucket(audioPath, "corpusbucket01");

    const config = {
      encoding: "FLAC",
      sampleRateHertz: 16000,
      languageCode: languageCode,
      enableAutomaticPunctuation: true,
      audioChannelCount: 1,
      enableWordConfidence: true,
      model: "default",
      enableWordTimeOffsets: true,
    };

    const [operation] = await speechClient.longRunningRecognize({
      audio: { uri: cloudStorageUri },
      config,
    });

    const [response] = await operation.promise();

    if (!response.results || response.results.length === 0) {
      throw new Error("No transcription results returned");
    }

    let transcription = "";
    const subtitles = [];
    let subtitleIndex = 1;

    for (const result of response.results) {
      const alternative = result.alternatives[0];
      const words = alternative.words;

      if (!words || words.length === 0) continue;

      const chunkSize = 5;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize);
        const text = chunk.map((w) => w.word).join(" ");

        const start = chunk[0].startTime;
        const end = chunk[chunk.length - 1].endTime;

        const formatTime = (time) => {
          const seconds = parseFloat(time.seconds || 0) + (time.nanos || 0) / 1e9;
          const date = new Date(0);
          date.setSeconds(seconds);
          return date.toISOString().substr(11, 12).replace(".", ",");
        };

        subtitles.push(
          `${subtitleIndex++}\n${formatTime(start)} --> ${formatTime(end)}\n${text}\n`
        );

        transcription += `${text} `;
      }
    }

    const transcriptPath = await saveTranscriptToFile(
      transcription,
      videoPath,
      languageCode,
      title
    );
    const srtPath = await saveSRTFile(subtitles, safeTitle);
    const vttPath = path.join(path.dirname(srtPath), `${safeTitle}.vtt`);

    convertSRTtoVTT(srtPath, vttPath);

    const vttURL = `/transcripts/${safeTitle}.vtt`;

    return {
      success: true,
      transcription: transcription.trim(),
      transcriptPath,
      transcriptURL: `/transcripts/${path.basename(transcriptPath)}`,
      srtPath,
      srtURL: `/transcripts/${path.basename(srtPath)}`,
      vttURL,
      language: languageCode,
      transcriptName: path.basename(transcriptPath),
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      error: error.message,
      transcription: "Transcription error",
      transcriptPath: null,
    };
  } finally {
    if (audioPath && fs.existsSync(audioPath)) {
      try {
        await fs.promises.unlink(audioPath);
      } catch (err) {
        console.error("Error cleaning temporary audio:", err);
      }
    }
  }
}
