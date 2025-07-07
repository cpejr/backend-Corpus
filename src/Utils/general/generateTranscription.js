import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v1p1beta1 } from "@google-cloud/speech";
const SpeechClient = v1p1beta1.SpeechClient;
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

export async function generateTranscription(
  videoPath,
  language = "en-US",
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

    const languageCode = normalizeLanguageCode(language);

    audioPath = await extractAudio(videoPath);

    const cloudStorageUri = await uploadToBucket(audioPath, "api-transcription");

    const config = {
      encoding: "FLAC",
      sampleRateHertz: 16000,
      languageCode: languageCode,
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

    let transcription = "";
    const subtitles = [];
    let subtitleIndex = 1;

    // 1. Sistema de diagnóstico melhorado
    const speakerStats = {
      totalWords: 0,
      validTags: 0,
      uniqueTags: new Set(),
      speakerMapping: {},
    };

    // 2. Pré-processamento: criar mapa de falantes considerando base zero
    const speakerMap = new Map();
    const isZeroBased = true; // API está usando tags baseadas em zero

    for (let i = 0; i < totalParticipants; i++) {
      const speakerId = isZeroBased ? i : i + 1;
      const speakerLabel = `Falante ${i + 1}`;
      speakerMap.set(speakerId, speakerLabel);
      speakerStats.speakerMapping[speakerId] = speakerLabel;
    }

    // 3. Adicionar casos especiais
    speakerMap.set("unknown", "Falante Desconhecido");
    speakerMap.set("invalid", "Falante Não Identificado");

    let allWords = [];
    for (const result of response.results) {
      const alternative = result.alternatives[0];
      if (alternative.words && alternative.words.length > 0) {
        allWords = allWords.concat(alternative.words);
      }
    }
    allWords.sort((a, b) => {
      const aSec = Number(a.startTime?.seconds || 0) + Number(a.startTime?.nanos || 0) / 1e9;
      const bSec = Number(b.startTime?.seconds || 0) + Number(b.startTime?.nanos || 0) / 1e9;
      return aSec - bSec;
    });

    let currentChunk = [];
    let currentSpeaker = null;

    for (let i = 0; i < allWords.length; i++) {
      const word = allWords[i];
      speakerStats.totalWords++;

      // 4. Normalização adaptativa de speakerTag
      let speakerTag = "unknown";

      try {
        // Converter para número
        const numericTag = Number(word.speakerTag);

        if (!isNaN(numericTag)) {
          // Aceitar tags baseadas em zero (0 a totalParticipants-1)
          if (numericTag >= 0 && numericTag < totalParticipants) {
            speakerTag = numericTag;
            speakerStats.validTags++;
            speakerStats.uniqueTags.add(numericTag);
          }
          // Aceitar tags baseadas em um (1 a totalParticipants)
          else if (numericTag >= 1 && numericTag <= totalParticipants) {
            speakerTag = numericTag - 1; // Converter para base zero
            speakerStats.validTags++;
            speakerStats.uniqueTags.add(numericTag);
          } else {
            speakerTag = "invalid";
          }
        } else if (typeof word.speakerTag === "string") {
          // Tentar extrair número de strings
          const match = word.speakerTag.match(/\d+/);
          if (match) {
            const num = parseInt(match[0]);
            if (num >= 0 && num < totalParticipants) {
              speakerTag = num;
              speakerStats.validTags++;
              speakerStats.uniqueTags.add(num);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao processar speakerTag:", word.speakerTag, error);
        speakerTag = "invalid";
      }

      // 5. Determinar se deve quebrar o chunk
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

    // Processar último chunk do result
    if (currentChunk.length > 0) {
      processChunk(currentChunk, currentSpeaker);
    }

    // Função de processamento
    function processChunk(chunk, speakerTag) {
      const text = chunk.map((w) => w.word).join(" ");
      const start = chunk[0].startTime;
      const end = chunk[chunk.length - 1].endTime;

      // 6. Obter rótulo com fallback inteligente
      let speakerLabel = speakerMap.get(speakerTag);

      if (!speakerLabel) {
        // Tentar converter para número se for string
        const numericTag = Number(speakerTag);
        if (!isNaN(numericTag)) {
          speakerLabel = `Falante ${numericTag + 1}`;
        } else {
          speakerLabel = `Falante ${speakerTag}`;
        }
      }

      const formatTime = (time) => {
        if (!time) return "00:00:00,000";
        const seconds = parseFloat(time.seconds || 0) + (time.nanos || 0) / 1e9;
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 12).replace(".", ",");
      };

      subtitles.push(`${subtitleIndex}\n${formatTime(start)} --> ${formatTime(end)}\n${text}\n`);

      transcription += `${formatTime(start)} --> ${formatTime(end)}\n${speakerLabel}: ${text}\n`;
      subtitleIndex++;
    }

    // 7. Relatório de diagnóstico completo
    console.log("===== DIAGNÓSTICO DE FALANTES =====");
    console.log(`Total de palavras processadas: ${speakerStats.totalWords}`);
    console.log(
      `Tags válidas detectadas: ${speakerStats.validTags} (${(
        (speakerStats.validTags / speakerStats.totalWords) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`Tags únicas encontradas: ${[...speakerStats.uniqueTags].join(", ")}`);
    console.log(`Mapeamento de falantes:`, speakerStats.speakerMapping);

    // 8. Relatório de falantes detectados
    if (speakerStats.uniqueTags.size > 0) {
      console.log("\nFalantes detectados:");
      speakerStats.uniqueTags.forEach((tag) => {
        const speakerLabel = speakerMap.get(tag) || `Falante ${tag + 1}`;
        console.log(`- Tag ${tag} → ${speakerLabel}`);
      });
    } else {
      console.warn("\n⚠️ Nenhum falante identificado! Verifique a configuração da API");
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
