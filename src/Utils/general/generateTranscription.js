import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { openai } from '../../Config/OpenAI.js';
import fs from 'fs';
import path from 'path';

export async function extractAudio(videoPath) {
  return new Promise((resolve, reject) => {
      const absoluteVideoPath = path.resolve(videoPath);
      const audioPath = absoluteVideoPath.replace(/\.[^/.]+$/, ".mp3"); 

      ffmpeg(absoluteVideoPath)
          .setFfmpegPath(ffmpegStatic)
          .output(audioPath)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .on('end', () => {
              resolve(audioPath);
          })
          .on('error', (err) => {
              reject(err);
          })
          .run();
  });
}
export async function generateTranscription(videoPath, language) {
    try {

        const languageMap = {
            'português': 'pt',
            'ingles': 'en',
            'inglês': 'en',
            'frances': 'fr',
            'francês': 'fr',
            'alemao': 'de',
            'alemão': 'de'
        };
        const normalizedLanguage = language.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const audioPath = await extractAudio(videoPath);
        const languageCode = languageMap[normalizedLanguage] || 'en'; 
        
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: 'whisper-1',
            language: languageCode, 
            response_format: 'text',
            temperature: 0.2,  
        });
        await fs.promises.unlink(audioPath);
        console.log("Transcrição concluída");
        return transcription;
    } catch (error) {
        
        console.log(error);
        return null;
    }
}
