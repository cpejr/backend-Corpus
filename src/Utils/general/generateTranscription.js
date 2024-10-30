import ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { openai } from "../../Config/OpenAI.js";

export async function generateTranscription(videoStream, language) {
  try {
    const audioStream = new PassThrough();

    ffmpeg(videoStream).noVideo().format("wav").pipe(audioStream, { end: true });

    const transciption = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: language,
      response_format: "text",
      temperature: 0,
    });

    return transciption;
  } catch (error) {
    console.log(error);
    return null;
  }
}
