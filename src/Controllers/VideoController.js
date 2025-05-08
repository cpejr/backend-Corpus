import VideosModel from "../Models/VideosModel.js";
import { generateThumb } from "../Utils/general/generateThumb.js";
import { generateTranscription } from "../Utils/general/generateTranscription.js";
import fs from "fs";
import path from "path";
import ArchivesController from "./ArchivesController.js";
import { convertToMinutes } from "../Utils/general/ConvertToMinutes.js";
import CountryModel from "../Models/CountryModel.js";
import LanguageModel from "../Models/LanguageModel.js";

class VideosController {

  async Create(req, res) {
    try {
      const { title, language, country, videoFile, code } = req.body;

      
      const foundCode = await VideosModel.findOne({ code });
      if (foundCode) {
        return res.status(409).json({ message: "Código já cadastrado!" });
      }

     
      if (!videoFile) {
        return res.status(400).json({ message: "Arquivo de vídeo não fornecido!" });
      }

      const regex = /^data:(video\/)(\w+)(;base64,)(.+)$/;
      const matches = videoFile.match(regex);

      let dataType, videoFileData;

      if (matches) {
        dataType = matches[2];
        videoFileData = matches[4];
      } else {
        return res.status(409).json({ message: 'A string Base64 não está no formato esperado.' });
      }

      // Convertendo o arquivo de vídeo de base64 para binário
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

      // Gerando a thumbnail do vídeo
      const thumbFile = await generateThumb(videoPath);
      if (!thumbFile) {
        return res.status(500).json({ message: "Erro ao gerar a thumbnail!" });
      }

      
      const archivesID = await ArchivesController.createArchives({
        thumbFile: thumbFile,
        videoFile: videoFileData,
        name: `${title}-${code}`,
      });

      await fs.promises.unlink(videoPath);

      
      const languageList = Array.isArray(language) ? language : [language];
      const countryList = Array.isArray(country) ? country : [country];

      
      const languagesInDB = await LanguageModel.find({
        name: { $in: languageList.map(lang => lang.toLowerCase()) }
      });

      if (languagesInDB.length !== languageList.length) {
        const missingLanguages = languageList.filter(lang => !languagesInDB.some(doc => doc.name.toLowerCase() === lang.toLowerCase()));
        return res.status(404).json({ message: `Os seguintes idiomas não foram encontrados: ${missingLanguages.join(', ')}` });
      }

      const countriesInDB = await CountryModel.find({
        name: { $in: countryList.map(c => c.toLowerCase()) }
      });

      if (countriesInDB.length !== countryList.length) {
        const missingCountries = countryList.filter(c => !countriesInDB.some(doc => doc.name.toLowerCase() === c.toLowerCase()));
        return res.status(404).json({ message: `Os seguintes países não foram encontrados: ${missingCountries.join(', ')}` });
      }

      
      let newVideo = req.body;
      delete newVideo.videoFile;

      newVideo = {
        ...newVideo,
        language: languagesInDB.map(doc => doc._id), 
        country: countriesInDB.map(doc => doc._id),   
        archives: archivesID,
        transcription: "placeholder", 
        duration: convertToMinutes(req.body.duration),
      };

      delete newVideo.description;
      delete newVideo.responsible;

      
      try {
        const video = await VideosModel.create(newVideo);
        return res.status(200).json(video);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erro ao criar o vídeo", error: err.message });
      }
    } catch (error) {
      console.error("Erro no servidor:", error);
      return res.status(500).json({ message: "Erro no servidor", error: error.message });
    }
  }

  async GetVideo(req, res) {
    try {
      const video = await VideosModel.find()
        .populate("language")  
        .populate("country"); 

      return res.status(200).json(video);  
    } catch (error) {
      return res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async GetVideoByParameters(req, res) {
    try {
      const { totalParticipants, dates, duration, country, language } = req.query;  
      let filter = {};

      if (totalParticipants) {
        if (totalParticipants.min == 10) {
          filter.totalParticipants = { $gte: Number(11) };
        } else {
          filter.totalParticipants = {
            $gte: Number(totalParticipants.min),
            $lte: Number(totalParticipants.max),
          };
        }
      }

      if (country) {
        const countryList = country.split(',').map(c => c.trim()); 
        const countries = await CountryModel.find({
          name: { $in: countryList.map(c => new RegExp(c, "i")) } 
        });
        if (countries.length > 0) {
          filter.country = { $all: countries.map(c => c._id) }; 
        } else {
          return res.status(404).json({ message: "Países não encontrados." });
        }
      }

      if (language) {
        const languageList = language.split(',').map(l => l.trim()); 
        const languages = await LanguageModel.find({
          name: { $in: languageList.map(l => new RegExp(l, "i")) }  
        });
        if (languages.length > 0) {
          filter.language = { $all: languages.map(l => l._id) }; 
        } else {
          return res.status(404).json({ message: "Idiomas não encontrados." });
        }
      }

      if (dates) {
        filter.date = { $gte: new Date(dates) };
      }

      if (duration) {
        filter.duration = { $gte: Number(duration) };
      }

      console.log("Filtro construído:", JSON.stringify(filter, null, 2));

      const videos = await VideosModel.find(filter)
        .populate('country')   
        .populate('language'); 

      return res.status(200).json(videos);
    } catch (error) {
      console.log(error);
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
      const video = await VideosModel.findById(id);
      await ArchivesController.deleteArchives(video.archives?._id);

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Vídeo deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
