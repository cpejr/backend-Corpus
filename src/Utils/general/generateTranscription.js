import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import PDFDocument from "pdfkit";
import { sendArchive } from "../../Config/Aws.js";

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
  return languageMap[normalized] || language;
}

function normalizeLanguageList(languages) {
  const list = Array.isArray(languages) ? languages : [languages];
  const seen = new Set();
  const out = [];
  for (const l of list) {
    const code = normalizeLanguageCode(l);
    if (code && !seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out.length ? out : ["en-US"];
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

async function createPDFInMemory(transcription, title) {
  const safeTitle = title
    ? title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
    : "transcricao";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(`Transcrição: ${safeTitle}`, { align: "left" });
    doc.moveDown();
    doc.fontSize(12).text(`Gerada em: ${new Date().toLocaleString()}`);
    doc.moveDown().text("----------------------------------------");
    doc.moveDown().fontSize(12).text(transcription, { align: "left" });

    doc.end();
  });
}

function createVTTInMemory(cues) {
  let vtt = "WEBVTT\n\n";
  for (const cue of cues) {
    vtt += `${cue.index}\n${cue.start} --> ${cue.end}\n${cue.text}\n\n`;
  }
  return Buffer.from(vtt, "utf-8");
}

function formatTimeVTT(time) {
  const seconds =
    parseFloat(time?.seconds || 0) + (Number(time?.nanos || 0) || 0) / 1e9;
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 12); // HH:MM:SS.mmm
}

export async function generateTranscription(
  videoPath,
  languages = "en-US",
  title,
  totalParticipants
) {
  let audioPath;
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error("Invalid video path");
    }

    const safeTitle = title
      ? title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
      : "transcricao";

    const langList = normalizeLanguageList(languages);
    const primaryLang = langList[0];
    const altLangs = langList.slice(1);

    audioPath = await extractAudio(videoPath);
    const cloudStorageUri = await uploadToBucket(audioPath, "corpusbucket01");

    const config = {
      encoding: "FLAC",
      sampleRateHertz: 16000,
      languageCode: primaryLang,
      ...(altLangs.length ? { alternativeLanguageCodes: altLangs } : {}),
      enableAutomaticPunctuation: true,
      audioChannelCount: 1,
      enableWordConfidence: true,
      model: "default",
      enableWordTimeOffsets: true,
      enableSpeakerDiarization: true,
      diarizationSpeakerCount: totalParticipants,
    };

    const [operation] = await speechClient.longRunningRecognize({
      audio: { uri: cloudStorageUri },
      config,
    });
    const [response] = await operation.promise();

    if (!response.results || response.results.length === 0) {
      throw new Error("No transcription results returned");
    }

    const allWords = [];
    for (const result of response.results) {
      const resultLang = result.languageCode || primaryLang;
      const alternative = result.alternatives?.[0];
      if (alternative?.words?.length) {
        for (const w of alternative.words) {
          allWords.push({
            ...w,
            _lang: resultLang,
          });
        }
      }
    }
    allWords.sort((a, b) => {
      const aSec =
        Number(a.startTime?.seconds || 0) +
        Number(a.startTime?.nanos || 0) / 1e9;
      const bSec =
        Number(b.startTime?.seconds || 0) +
        Number(b.startTime?.nanos || 0) / 1e9;
      return aSec - bSec;
    });

    let transcription = "";
    const cues = [];
    let subtitleIndex = 1;

    let currentChunk = [];
    let currentSpeaker = null;
    let currentLang = null;

    const processChunk = (chunk, speakerTag, langTag) => {
      if (!chunk.length) return;
      const text = chunk.map((w) => w.word).join(" ");
      const start = chunk[0].startTime;
      const end = chunk[chunk.length - 1].endTime;
      const startStr = formatTimeVTT(start);
      const endStr = formatTimeVTT(end);
      const speakerLabel = `Falante ${speakerTag || 1}`;
      const langLabel = langTag || primaryLang;

      const line = `${speakerLabel} [${langLabel}]: ${text}`;
      cues.push({
        index: subtitleIndex,
        start: startStr,
        end: endStr,
        text: line,
      });
      transcription += `${startStr} --> ${endStr}\n${line}\n`;
      subtitleIndex++;
    };

    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      const speakerTag = w.speakerTag || currentSpeaker || 1;
      const langTag = w._lang || currentLang || primaryLang;

      const shouldBreak =
        (currentSpeaker !== null && currentSpeaker !== speakerTag) ||
        (currentLang !== null && currentLang !== langTag) ||
        currentChunk.length >= 5;

      if (shouldBreak && currentChunk.length) {
        processChunk(currentChunk, currentSpeaker, currentLang);
        currentChunk = [];
      }

      if (currentChunk.length === 0) {
        currentSpeaker = speakerTag;
        currentLang = langTag;
      }

      currentChunk.push(w);
    }

    if (currentChunk.length) {
      processChunk(currentChunk, currentSpeaker, currentLang);
    }

    const vttBuffer = createVTTInMemory(cues);
    const vttS3Key = await sendArchive(
      vttBuffer,
      `${safeTitle}.vtt`,
      "text/vtt"
    );

    const pdfBuffer = await createPDFInMemory(transcription.trim(), safeTitle);
    const pdfS3Key = await sendArchive(
      pdfBuffer,
      `${safeTitle}.pdf`,
      "application/pdf"
    );

    const languagesDetected = Array.from(
      new Set(response.results.map((r) => r.languageCode).filter(Boolean))
    );

    return {
      success: true,
      transcription: transcription.trim(),
      languagesRequested: langList,
      languagesDetected,
      pdfS3Key,
      vttS3Key,
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      error: error.message,
      transcription: "Transcription error",
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
