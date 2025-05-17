import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import PDFDocument from "pdfkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, "google.json");
const client = new SpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});
const storage = new Storage({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

const LANGUAGE_MAP = {
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

  return LANGUAGE_MAP[normalized] || "en-US";
}

async function extractAudio(videoPath, outputFormat = "flac") {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Arquivo de vídeo não encontrado: ${videoPath}`);
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
    await storage.bucket(bucketName).upload(filePath, {
      destination,
      resumable: false,
    });
    return `gs://${bucketName}/${destination}`;
  } catch (error) {
    throw new Error(`Falha no upload para o bucket: ${error.message}`);
  }
}

async function saveTranscriptToFile(transcription, videoPath, languageCode, customTitle = null) {
  const transcriptsDir = path.join(__dirname, "../../persistent_storage/transcripts");

  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  const safeTitle = customTitle
    ? customTitle.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
    : "transcricao"; // Fallback se customTitle for null

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
export async function generateTranscription(videoPath, language = "en-US", customTitle = null) {
  let audioPath;

  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error("Caminho do vídeo inválido");
    }

    const languageCode = normalizeLanguageCode(language);
    console.log(`Processando vídeo no idioma: ${languageCode}`);

    audioPath = await extractAudio(videoPath);
    console.log(`Áudio extraído: ${audioPath}`);

    const gcsUri = await uploadToBucket(audioPath, "api-transcription");
    console.log(`Arquivo enviado para: ${gcsUri}`);

    //Config Aqui? trocar para novo arquivo
    const config = {
      encoding: "FLAC",
      sampleRateHertz: 16000,
      languageCode: languageCode,
      enableAutomaticPunctuation: true,
      audioChannelCount: 1,
      enableWordConfidence: true,
      model: "default",
    };

    const stats = fs.statSync(audioPath);
    const isLongAudio = stats.size / (16000 * 2) > 60;

    let transcription;

    if (!isLongAudio) {
      console.log("Usando reconhecimento síncrono");
      const [response] = await client.recognize({
        audio: { uri: gcsUri },
        config,
      });

      transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");
    } else {
      console.log("Usando reconhecimento assíncrono (áudio longo)");
      const [operation] = await client.longRunningRecognize({
        audio: { uri: gcsUri },
        config,
      });

      const [response] = await operation.promise();
      transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");
    }

    if (!transcription) {
      throw new Error("Nenhum resultado de transcrição retornado");
    }

    const transcriptPath = await saveTranscriptToFile(
      transcription,
      videoPath,
      languageCode,
      customTitle
    );
    console.log(`Transcrição salva em: ${transcriptPath}`);

    return {
      success: true,
      transcription: transcription,
      transcriptPath: transcriptPath,
      transcriptURL: `/transcripts/${path.basename(transcriptPath)}`,
      language: languageCode,
      transcriptName: path.basename(transcriptPath),
    };
  } catch (error) {
    console.error("Erro na transcrição:", error);
    return {
      success: false,
      error: error.message,
      transcription: "Erro na transcrição",
      transcriptPath: null,
    };
  } finally {
    if (audioPath && fs.existsSync(audioPath)) {
      try {
        await fs.promises.unlink(audioPath);
      } catch (err) {
        console.error("Erro ao limpar áudio temporário:", err);
      }
    }
  }
}
