import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from "path";

export async function generateThumb(inputPath) {
    try {
        ffmpeg.setFfmpegPath(ffmpegStatic);

        const filePath = path.join("./src/Utils/database", 'thumb.jpg');

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .takeScreenshots({
                    count: 1,
                    timemarks: ["2"],
                    filename: path.basename(filePath),
                    folder: path.dirname(filePath),
                })
                .on('end', resolve)
                .on('error', (error) => {
                    console.error('Erro ao gerar a thumbnail:', error);
                    reject(error);
                });
        });
        
        const thumbnailData = await fs.readFile(filePath);
        const thumbnailBase64 = thumbnailData.toString('base64');
        await fs.unlink(filePath);

        return thumbnailBase64;
''
    } catch (error) {
        console.log(error);
        return null;
    }
}