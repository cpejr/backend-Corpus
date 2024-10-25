import VideosModel from "../Models/VideosModel.js";
import ffmpeg from 'fluent-ffmpeg';
import streamifier from 'streamifier';
import { PassThrough } from 'stream';
import { openai } from "../Config/OpenAI.js";
import { generateThumb } from "../Utils/general/generateThumb.js";
import { generateTranscription } from "../Utils/general/generateTranscription.js";

class VideosController {
  async Create(req, res) {
    try {
    // objeto que chega { title, description, videoFile, code, context, responsible, totalParticipants, country, language, duration, date } - falta tirar videoFile e gerar thumbnail e transcription   
      const { language, videoFile, code } = req.body;

      const foundCode = await VideosModel.findOne({ code, });
      if (foundCode) {
        return res.status(409).json({ message: "Código já cadastrado!" });
      }

      // Conversão do arquivo para stream de memória
      const videoStream = streamifier.createReadStream(Buffer.from(videoFile, 'base64'));

      if (!videoStream) {
        return res.status(500).json({ message: "Erro ao fazer a conversão de arquivo!" });
      }

      const thumbnailFile = await generateThumb(videoStream);

      if (!thumbnailFile) {
        return res.status(500).json({ message: "Erro ao gerar a thumbnail!" });
      }

      const transciption = await generateTranscription(videoStream, language);

      if (!transciption) {
        return res.status(500).json({ message: "Erro ao gerar a transcrição!" });
      }

      const newVideo = { ...req.body, thumbnail: thumbnailFile, transciption: transciption };
      
      const video = await VideosModel.create(newVideo);

      return res.status(200).json(video);
    } catch (error) {
      res.status(500).json({ message: "Erro no servidor", error: error.message });
    }
  }



  async GetVideo(req, res) {
    try {
      const video = await VideosModel.find();
      return res.status(200).json(video);
    } catch (error) {
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async Destroy(req, res) {
    try {
      const { id } = req.params;

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Video deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
