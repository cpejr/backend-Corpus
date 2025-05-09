import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import PDFDocument from 'pdfkit';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirName = dirname(currentFilePath);

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(currentDirName, 'google.json');

const speechClient = new SpeechClient();
const storageClient = new Storage();

const languageMap = {
  'portugues': 'pt-BR',
  'pt': 'pt-BR',
  'pt-br': 'pt-BR',
  'ingles': 'en-US',
  'inglês': 'en-US',
  'english': 'en-US',
  'espanhol': 'es-ES',
  'español': 'es-ES',
  'frances': 'fr-FR',
  'francés': 'fr-FR',
  'fr': 'fr-FR',
  'alemao': 'de-DE',
  'alemán': 'de-DE',
  'italiano': 'it-IT',
  'italian': 'it-IT',
};

function normalizeLanguageCode(language) {
  if (!language) return 'en-US';

  const normalized = language.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '');

  return languageMap[normalized] || 'en-US';
}

async function extractAudio(videoPath, outputFormat = 'flac') {
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
      .audioCodec('flac')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .run();
  });
}

async function uploadToBucket(filePath, bucketName) {
  try {
    const destination = path.basename(filePath);
    await storageClient.bucket(bucketName).upload(filePath, {
      destination,
      resumable: false
    });
    return `gs://${bucketName}/${destination}`;
  } catch (error) {
    throw new Error(`Bucket upload failed: ${error.message}`);
  }
}

async function saveTranscriptToFile(transcription, videoPath, languageCode, customTitle = null) {
  const transcriptsDir = path.join(currentDirName, '../../persistent_storage/transcripts');
  
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  const fileName = customTitle || path.basename(videoPath, path.extname(videoPath));
  const transcriptPath = path.join(transcriptsDir, `${fileName}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(transcriptPath);
  doc.pipe(writeStream);

  doc.fontSize(16).text(`Transcript: ${fileName}`, { align: 'left' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated at: ${new Date().toLocaleString()}`);
  doc.text(`Language: ${languageCode}`);
  doc.moveDown().text('----------------------------------------');
  doc.moveDown().fontSize(12).text(transcription, { align: 'left' });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(transcriptPath));
    writeStream.on('error', reject);
  });
}

export async function generateTranscription(videoPath, language = 'en-US', customTitle = null) {
  let audioPath;

  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error('Invalid video path');
    }

    const languageCode = normalizeLanguageCode(language);
    console.log(`Processing video in language: ${languageCode}`);

    audioPath = await extractAudio(videoPath);
    console.log(`Audio extracted: ${audioPath}`);

    const cloudStorageUri = await uploadToBucket(audioPath, 'api-transcription');
    console.log(`File uploaded to cloud storage: ${cloudStorageUri}`);

    const config = {
      encoding: 'FLAC',
      sampleRateHertz: 16000,
      languageCode: languageCode,
      enableAutomaticPunctuation: true,
      audioChannelCount: 1,
      enableWordConfidence: true,
      model: 'default'
    };

    const audioFileStats = fs.statSync(audioPath);
    const isLongAudio = (audioFileStats.size / (16000 * 2)) > 60;

    let transcription;

    if (!isLongAudio) {
      console.log('Using synchronous recognition');
      const [response] = await speechClient.recognize({
        audio: { uri: cloudStorageUri },
        config
      });

      transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    } else {
      console.log('Using asynchronous recognition (long audio)');
      const [operation] = await speechClient.longRunningRecognize({
        audio: { uri: cloudStorageUri },
        config
      });

      const [response] = await operation.promise();
      transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    }

    if (!transcription) {
      throw new Error('No transcription results returned');
    }

    const transcriptPath = await saveTranscriptToFile(transcription, videoPath, languageCode, customTitle);
    console.log(`Transcript saved at: ${transcriptPath}`);

    return {
      success: true,
      transcription: transcription,
      transcriptPath: transcriptPath,
      transcriptURL: `/transcripts/${encodeURIComponent(path.basename(transcriptPath))}`,
      language: languageCode,
      transcriptName: path.basename(transcriptPath),
    };

  } catch (error) {
    console.error('Transcription error:', error);
    return {
      success: false,
      error: error.message,
      transcription: "Transcription error",
      transcriptPath: null
    };
  } finally {
    if (audioPath && fs.existsSync(audioPath)) {
      try {
        await fs.promises.unlink(audioPath);
      } catch (err) {
        console.error('Error cleaning temporary audio:', err);
      }
    }
  }
}
