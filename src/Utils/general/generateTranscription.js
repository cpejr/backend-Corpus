import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { openai } from '../../Config/OpenAI.js';
import fs from 'fs';

export async function generateTranscription(videoPath, language) {
    try {

        const transciption = await openai.audio.transcriptions.create({
            file: fs.createReadStream(videoPath),
            model: 'whisper-1',
            language: language, 
            response_format: 'text',
            temperature: 0,  
        })

        return transciption;

    } catch (error) {
        console.log(error);
        return null;
    }
}