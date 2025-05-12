import VideosModel from "../Models/VideosModel.js";
import { generateThumb } from "../Utils/general/generateThumb.js";
import { generateTranscription } from "../Utils/general/generateTranscription.js";
import fs from "fs";
import path from "path";
import ArchivesController from "./ArchivesController.js";
import { convertToMinutes } from "../Utils/general/ConvertToMinutes.js";

class VideosController {
  async Create(req, res) {
    try {
      console.log('Iniciando processo de criação de vídeo...');

      const { 
        title, 
        language, 
        videoFile, 
        code, 
        date, 
        duration,
        country,
        totalParticipants,
        responsibles,
        context,
        ShortDescription
      } = req.body;

      const requiredFields = {
        title: 'Título',
        language: 'Idioma',
        videoFile: 'Arquivo de vídeo',
        code: 'Código',
        country: 'País',
        totalParticipants: 'Total de participantes',
        responsibles: 'Responsáveis',
        context: 'Contexto',
        ShortDescription: 'Descrição curta'
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([field]) => !req.body[field])
        .map(([_, name]) => name);

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: "Campos obrigatórios faltando!",
          missingFields
        });
      }

      const foundCode = await VideosModel.findOne({ code });
      if (foundCode) {
        return res.status(409).json({ message: "Código já cadastrado!" });
      }

      const regex = /^data:(video\/)(\w+)(;base64,)(.+)$/;
      const matches = videoFile.match(regex);
      if (!matches) {
        return res.status(400).json({ message: 'Formato de vídeo inválido!' });
      }

      const dataType = matches[2];
      const videoFileData = matches[4];
      const videoBuffer = Buffer.from(videoFileData, 'base64');
      if (videoBuffer.length === 0) {
        return res.status(400).json({ message: "Arquivo de vídeo vazio!" });
      }

      const videoPath = path.join("./src/Utils/database", `input.${dataType}`);
      await fs.promises.writeFile(videoPath, videoBuffer);
      console.log('Vídeo temporário salvo em:', videoPath);

      const thumbFile = await generateThumb(videoPath);
      if (!thumbFile) {
        await fs.promises.unlink(videoPath);
        return res.status(500).json({ message: "Erro ao gerar thumbnail!" });
      }

      const archivesID = await ArchivesController.createArchives({
        thumbFile: thumbFile, 
        videoFile: videoFileData,
        name: `${title}-${code}`,
      });

      const transcription = await generateTranscription(videoPath, language, title);
      console.log('Resultado da transcrição:', transcription ? 'Sucesso' : 'Falha');

      await fs.promises.unlink(videoPath).catch(console.error);

      const videoData = {
        title,
        language,
        code,
        archives: archivesID,
        transcription: transcription.transcription || "Transcrição não disponível", 
        duration: convertToMinutes(duration || 0),
        date: date || new Date(),
        country,
        totalParticipants: Number(totalParticipants),
        responsibles,
        context,
        ShortDescription
      };

      const video = await VideosModel.create(videoData);
      console.log('Vídeo criado com sucesso:', video._id);

      return res.status(201).json({
        message: "Vídeo criado com sucesso",
        video,
        thumbURL: thumbFile,
        transcription: transcription.transcription || "Transcrição não disponível",
        transcriptURL: transcription.transcriptURL
      });

    } catch (error) {
      console.error('Erro no servidor:', {
        message: error.message,
        stack: error.stack,
        body: req.body
      });
      return res.status(500).json({ 
        message: "Erro no servidor", 
        error: error.message,
        details: error.errors 
      });
    }
  }
  async DownloadVideo(req, res) {
  try {
    const { id } = req.params;
    const video = await VideosModel.findById(id);

    if (!video || !video.archives || !video.archives.videoFile) {
      return res.status(404).json({ message: "Vídeo não encontrado" });
    }

    const base64 = video.archives.videoFile;
    const buffer = Buffer.from(base64, 'base64');

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${video.title}.mp4"`,
    });

    return res.send(buffer);
  } catch (error) {
    console.error("Erro ao baixar vídeo:", error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
}
  async GetVideo(req, res) {
    try {
      const videos = await VideosModel.find().populate('archives');
      return res.status(200).json(videos);
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
      return res.status(500).json({ message: "Erro ao buscar vídeos" });
    }
  }

  async GetVideoByParameters(req, res) {
    try {
      let filter = {};
      const { totalParticipants, dates, duration, country, language } = req.query.filters || {};

      if (totalParticipants) {
        filter.totalParticipants = totalParticipants.min == 10 
          ? { $gte: 11 } 
          : { $gte: Number(totalParticipants.min), $lte: Number(totalParticipants.max) };
      }
      if (country) filter.country = country;
      if (language) filter.language = language;
      if (dates) filter.date = { $gte: new Date(dates) };
      if (duration) filter.duration = { $gte: Number(duration) };

      const videos = await VideosModel.find(filter).populate('archives');
      return res.status(200).json(videos);

    } catch (error) {
      console.error('Erro ao filtrar vídeos:', error);
      return res.status(500).json({ message: "Erro ao filtrar vídeos" });
    }
  }

  async UpdateVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findByIdAndUpdate(
        id, 
        req.body, 
        { new: true, runValidators: true }
      ).populate('archives');
      
      if (!video) {
        return res.status(404).json({ message: "Vídeo não encontrado" });
      }
      
      return res.status(200).json(video);
    } catch (error) {
      console.error('Erro ao atualizar vídeo:', error);
      return res.status(500).json({ message: "Erro ao atualizar vídeo" });
    }
  }

  async Destroy(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);
      
      if (!video) {
        return res.status(404).json({ message: "Vídeo não encontrado" });
      }

      if (video.archives) {
        await ArchivesController.deleteArchives(video.archives._id);
      }

      await VideosModel.findByIdAndDelete(id);
      return res.status(200).json({ message: "Vídeo deletado com sucesso!" });

    } catch (error) {
      console.error('Erro ao deletar vídeo:', error);
      return res.status(500).json({ message: "Erro ao deletar vídeo" });
    }
  }
}

export default new VideosController();
