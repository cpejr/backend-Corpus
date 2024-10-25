import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';

export async function generateThumb(videoStream) {
    try {
        const thumbnailStream = new PassThrough();

        ffmpeg(videoStream).screenshots({ timestamps: [5], }).pipe(thumbnailStream, { end: true });

        const chunks = [];
        for await (const chunk of thumbnailStream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);

        const thumbnailFile = buffer.toString('base64');

        return thumbnailFile;

    } catch (error) {
        console.log(error);
        return null;
    }
}