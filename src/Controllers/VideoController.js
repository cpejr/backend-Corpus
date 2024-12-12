import VideosModel from "../Models/VideosModel.js";
import { generateThumb } from "../Utils/general/generateThumb.js";
import { generateTranscription } from "../Utils/general/generateTranscription.js";
import fs from "fs";
import path from "path";
import ArchivesController from "./ArchivesController.js";

class VideosController {
  async Create(req, res) {
    try {
      // objeto que chega { title, description, videoFile, code, context, responsible, totalParticipants, country, language, duration, date } - falta tirar videoFile e gerar thumbnail e transcription
      console.log(req.body)
      const { title, language, videoFile, code } = req.body;

      // const foundCode = await VideosModel.findOne({ code });
      // if (foundCode) {
      //   return res.status(409).json({ message: "Código já cadastrado!" });
      // }

      if (!videoFile) {
        return res.status(400).json({ message: "Arquivo de vídeo não fornecido!" });
      }

      const regex = /^data:(video\/)(\w+)(;base64,)(.+)$/;
      const matches = videoFile.match(regex);

      let dataType;
      let videoFileData;
      
      if (matches) {
        dataType = matches[2];
        videoFileData = matches[4];
      } else {
        return res.status(409).json({ message: 'A string Base64 não está no formato esperado.'});
      }

      const videoBuffer = Buffer.from(videoFileData, 'base64');

      if (videoBuffer.length === 0) {
        return res.status(400).json({ message: "Arquivo de vídeo vazio/inválido!" });
      }

      const videoPath = path.join("./src/Utils/database", `input.${dataType}`);

      const videoStream = fs.createWriteStream(videoPath);

      videoStream.write(videoBuffer);
      videoStream.end();

      videoStream.on('error', (err) => {
        return res.status(500).json({ message: "'Erro ao salvar o arquivo:'", error: err });
      });

      const thumbFile = await generateThumb(videoPath);

      if (!thumbFile) {
        return res.status(500).json({ message: "Erro ao gerar a thumbnail!" });
      }

      // Criação do Archives
      const archivesID = await ArchivesController.createArchives({
        thumbFile: thumbFile, 
        videoFile: videoFileData,
        name: `${title}-${code}`,
      });

      const transcription = await generateTranscription(videoPath, language);

      if (!transcription) {
        return res.status(500).json({ message: "Erro ao gerar a transcrição!" });
      }

      await fs.promises.unlink(videoPath);

      let newVideo = req.body;

      delete newVideo.videoFile;

      newVideo = { ...newVideo, archives: archivesID, transcription: transcription?.data?.text };

      //const video = await VideosModel.create(newVideo);

      return res.status(200).json(newVideo);
    } catch (error) {
      res.status(500).json({ message: "Erro no servidor", error: error.message });
    }
  }

  async GetVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);
      return res.status(200).json(video);
    } catch (error) {
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async UpdateVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findByIdAndUpdate(id, req.body, { new: true });
      return res.status(200).json(video);
    } catch (error) {
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async Destroy(req, res) {
    try {
      const { id } = req.params;
      console.log(id)
      const video = await VideosModel.findById(id);
      await ArchivesController.deleteArchives(video.archives?._id);

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Video deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
