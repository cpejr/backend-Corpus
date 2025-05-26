import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import PDFDocument from "pdfkit";
import { convertSRTtoVTT } from "./convertSrtToVtt";

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

async function saveTranscriptToFile(transcription, videoPath, languageCode, customTitle = null) {
  const transcriptsDir = path.join(__dirname, "../../persistent_storage/transcripts");

  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  const safeTitle = customTitle
    ? customTitle.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
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

export async function generateTranscription(videoPath, language = "en-US", customTitle = null) {
  let audioPath;

  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error("Invalid video path");
    }

    const languageCode = normalizeLanguageCode(language);
    console.log(`Processing video in language: ${languageCode}`);

    audioPath = await extractAudio(videoPath);
    console.log(`Audio extracted: ${audioPath}`);

    const cloudStorageUri = await uploadToBucket(audioPath, "api-transcription");
    console.log(`File uploaded to cloud storage: ${cloudStorageUri}`);

    //Config Aqui? trocar para novo arquivo
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

    const audioFileStats = fs.statSync(audioPath);
    const isLongAudio = audioFileStats.size / (16000 * 2) > 60;

    let transcription;

    if (!isLongAudio) {
      console.log("Using synchronous recognition");
      const [response] = await speechClient.recognize({
        audio: { uri: cloudStorageUri },
        config,
      });

      transcription = "";
      const subtitles = [];

      let subtitleIndex = 1;

      response.results.forEach((result) => {
        const alternative = result.alternatives[0];
        const words = alternative.words;

        if (!words || words.length === 0) return;

        // Quebra em blocos de 5 palavras (pode ajustar)
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
      });
    } else {
      console.log("Using asynchronous recognition (long audio)");
      const [operation] = await speechClient.longRunningRecognize({
        audio: { uri: cloudStorageUri },
        config,
      });

      const [response] = await operation.promise();
      transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");
    }

    if (!transcription) {
      throw new Error("No transcription results returned");
    }

    const transcriptPath = await saveTranscriptToFile(
      transcription,
      videoPath,
      languageCode,
      customTitle
    );
    const srtPath = await saveSRTFile(subtitles, customTitle || "legenda");
    const vttPath = srtPath.replace(/\.srt$/, ".vtt");
    console.log(`Legenda SRT salva em: ${srtPath}`);
    convertSRTtoVTT(srtPath, vttPath);

    console.log(`Transcript saved at: ${transcriptPath}`);

    return {
      success: true,
      transcription: transcription.trim(),
      transcriptPath,
      transcriptURL: `/transcripts/${encodeURIComponent(path.basename(transcriptPath))}`,
      srtPath,
      srtURL: `/transcripts/${encodeURIComponent(path.basename(srtPath))}`,
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
