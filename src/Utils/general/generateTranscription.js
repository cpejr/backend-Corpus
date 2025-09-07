import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import PDFDocument from "pdfkit";
import { sendArchive } from "../../Config/Aws.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try using keyFilename if available, otherwise use credentials object
const clientConfig = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? {
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_PROJECT_ID,
    }
  : {
      credentials: {
        type: process.env.GOOGLE_TYPE || "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: process.env.GOOGLE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.GOOGLE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
        universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN || "googleapis.com"
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    };

const speechClient = new SpeechClient(clientConfig);
const storageClient = new Storage(clientConfig);

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

async function createPDFInMemory(transcription, languageCode, title) {
  const safeTitle = title
    ? title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
    : "transcricao";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(`Transcrição: ${safeTitle}`, { align: "left" });
    doc.moveDown();
    doc.fontSize(12).text(`Gerada em: ${new Date().toLocaleString()}`);
    doc.text(`Idioma: ${languageCode}`);
    doc.moveDown().text("----------------------------------------");
    doc.moveDown().fontSize(12).text(transcription, { align: "left" });

    doc.end();
  });
}

function createVTTInMemory(subtitles){
  let vttContent = "WEBVTT\n\n";

  for (const subtitle of subtitles){
    vttContent += `${subtitle}\n\n`;
    
  }
  return Buffer.from(vttContent, 'utf-8');
}

export async function generateTranscription(videoPath, language = "en-US", title, totalParticipants) {
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
      enableSpeakerDiarization: true,              // 👈 adicionado
      diarizationSpeakerCount: totalParticipants, // 👈 adicionado
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

    // junta todas as palavras com timestamps e falantes
    let allWords = [];
    for (const result of response.results) {
      const alternative = result.alternatives[0];
      if (alternative.words && alternative.words.length > 0) {
        allWords = allWords.concat(alternative.words);
      }
    }

    // ordenar cronologicamente
    allWords.sort((a, b) => {
      const aSec = Number(a.startTime?.seconds || 0) + Number(a.startTime?.nanos || 0) / 1e9;
      const bSec = Number(b.startTime?.seconds || 0) + Number(b.startTime?.nanos || 0) / 1e9;
      return aSec - bSec;
    });

    let currentChunk = [];
    let currentSpeaker = null;

    const processChunk = (chunk, speakerTag) => {
      const text = chunk.map((w) => w.word).join(" ");
      const start = chunk[0].startTime;
      const end = chunk[chunk.length - 1].endTime;
      const speakerLabel = `Falante ${speakerTag || 1}`;

        const formatTimeVTT = (time) => {
          const seconds = parseFloat(time.seconds || 0) + (time.nanos || 0) / 1e9;
          const date = new Date(0);
          date.setSeconds(seconds);
          return date.toISOString().substr(11, 12);
        };

      subtitles.push(
        `${subtitleIndex}\n${formatTimeVTT(start)} --> ${formatTimeVTT(end)}\n${speakerLabel}: ${text}\n`
      );

      transcription += `${formatTimeVTT(start)} --> ${formatTimeVTT(end)}\n${speakerLabel}: ${text}\n`;
      subtitleIndex++;
    };

    for (let i = 0; i < allWords.length; i++) {
      const word = allWords[i];
      const speakerTag = word.speakerTag || currentSpeaker || 1; 
      const shouldBreakChunk =
        (currentSpeaker !== null && currentSpeaker !== speakerTag) || currentChunk.length >= 5;

      if (shouldBreakChunk && currentChunk.length > 0) {
        processChunk(currentChunk, currentSpeaker);
        currentChunk = [];
      }

      if (currentChunk.length === 0) {
        currentSpeaker = speakerTag;
      }

      currentChunk.push(word);
    }

    if (currentChunk.length > 0) {
      processChunk(currentChunk, currentSpeaker);
    }


    const vttBuffer = createVTTInMemory(subtitles);
    const vttS3Key = await sendArchive(vttBuffer, `${safeTitle}.vtt`, "text/vtt");

    const pdfBuffer = await createPDFInMemory(transcription, languageCode, safeTitle);
    const pdfS3Key = await sendArchive(pdfBuffer, `${safeTitle}.pdf`, "application/pdf");
    

    return {
      success: true,
      transcription: transcription.trim(),
      language: languageCode,
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
