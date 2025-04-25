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
      // objeto que chega { title, description, videoFile, code, context, responsible, totalParticipants, country, language, duration, date } - falta tirar videoFile e gerar thumbnail e transcription

      const { title, language, videoFile, code } = req.body;
      const foundCode = await VideosModel.findOne({ code });
      if (foundCode) {
        return res.status(409).json({ message: "Código já cadastrado!" });
      }

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

      
      const archivesID = await ArchivesController.createArchives({
        thumbFile: thumbFile, 
        videoFile: videoFileData,
        name: `${title}-${code}`,
      });
      // let transcription = await generateTranscription(videoPath, language);

      // if (!transcription) {
      //   transcription = "legenda placeholder"
      // }else{
      //   transcription = transcription?.data?.text
      // }
      let transcription = "placegolder"
      await fs.promises.unlink(videoPath);
      
      let newVideo = req.body;

      delete newVideo.videoFile;

      //transcription?.data?.text
    
      newVideo = { ...newVideo, archives: archivesID, transcription: transcription ,duration:convertToMinutes(req.body.duration) };
      delete newVideo.description
      delete newVideo.responsible
      try{

      const video = await VideosModel.create(newVideo);
      return res.status(200).json(video);
    }catch(err){
      console.log(err)
    }

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

  async GetVideoByParameters(req, res) {
    try {
      const filters = req.query;  
  
      if (!filters) {
        return res.status(400).json({ message: "Filtros não fornecidos." });
      }
  
      console.log(filters); console.log("soh para ver e separar");
  
      const filterConditions = {};
  
      if (filters.totalParticipants) {
        const { min, max } = JSON.parse(filters.totalParticipants);  // pois no query params vai vir como string
  
        if (isNaN(min) || (max && isNaN(max))) {
          return res.status(400).json({ message: "Intervalo de participantes inválido." });
        }
  
        let participantFilter = {};
        if (min) participantFilter.$gte = Number(min); 
        if (max) participantFilter.$lte = Number(max);
  
        filterConditions.totalParticipants = participantFilter;
      }
  
      if (filters.country) {
        const countryDoc = await CountryModel.findOne({
          name: { $regex: new RegExp(filters.country, "i") },
        });
  
        if (countryDoc) {
          filterConditions.country = countryDoc._id; 
        } else {
          return res.status(404).json({ message: "País não encontrado." });
        }
      }
  
      if (filters.language) {
        const languageDoc = await LanguageModel.findOne({
          name: { $regex: new RegExp(filters.language, "i") },
        });
  
        if (languageDoc) {
          filterConditions.language = languageDoc._id; 
        } else {
          return res.status(404).json({ message: "Linguagem não encontrada." });
        }
      }
  
      if (filters.dates) {
        filterConditions.date = { $gte: new Date(filters.dates) }; 
      }
  
      if (filters.duration) {
        const duration = Number(filters.duration); 
        if (isNaN(duration)) {
          return res.status(400).json({ message: "Duração inválida." });
        }
        filterConditions.duration = { $gte: duration };
      }
  
      console.log("Filtro gerado:", filterConditions);
  
      const videos = await VideosModel.find(filterConditions);
  
      if (!videos || videos.length === 0) {
        return res.status(404).json({ message: "Nenhum vídeo encontrado com os filtros aplicados." });
      }
  
      return res.status(200).json(videos);
  
    } catch (error) {
      console.error("Erro ao buscar vídeos:", error);
      return res.status(500).json({ message: "Erro ao buscar vídeos", error: error.message });
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
      const video = await VideosModel.findById(id);
      console.log(video.archives._id)
      await ArchivesController.deleteArchives(video.archives?._id);

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Video deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
