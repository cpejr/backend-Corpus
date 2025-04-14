import VideosModel from "../Models/VideosModel.js";
import CountryModel from "../Models/CountryModel.js"; // Importa o modelo de país
import LanguageModel from "../Models/LanguageModel.js"; // Importa o modelo de linguagem
import { buildVideoFilters } from "./FilterController.js"; // Importa a função buildVideoFilters

class VideosController {
 
  async Create(req, res) {
    try {
      const { title, language, videoFile, code } = req.body;

      const foundCode = await VideosModel.findOne({ code });
      if (foundCode) {
        return res.status(409).json({ message: "Código já cadastrado!" });
      }

      const languageExists = await LanguageModel.findById(language);
      if (!languageExists) {
        return res.status(400).json({ message: "Linguagem não encontrada!" });
      }

      // Verificação do arquivo de vídeo
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
        return res.status(409).json({ message: 'A string Base64 não está no formato esperado.' });
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

      let transcription = "placegolder";

      await fs.promises.unlink(videoPath);

      let newVideo = req.body;

      delete newVideo.videoFile;

      newVideo = {
        ...newVideo,
        archives: archivesID,
        transcription: transcription,
        language: languageExists._id
      };

      const video = await VideosModel.create(newVideo);
      return res.status(200).json(video);

    } catch (error) {
      res.status(500).json({ message: "Erro no servidor", error: error.message });
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
      const filters = req.body; 
      const filterObject = await buildVideoFilters(filters);  

      
      if (filters.country) {
        const country = await CountryModel.findOne({ name: new RegExp(filters.country, "i") }); //procura o pais qe tenha o mesmo id do ...
        if (country) {
          filterObject.country = country._id;  // SE encontrar o país ele transforma em id
        } else {
          return res.status(404).json({ message: "País não encontrado" });
        }
      }

      
      if (filters.language) {
        const language = await LanguageModel.findOne({ name: new RegExp(filters.language, "i") }); 
        if (language) {
          filterObject.language = language._id;  
        } else {
          return res.status(404).json({ message: "Idioma não encontrado" });
        }
      }

      const videos = await VideosModel.find(filterObject)
        .populate("language") 
        .populate("country"); 

      return res.status(200).json(videos); 
    } catch (error) {
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
      await ArchivesController.deleteArchives(video.archives?._id);
      await VideosModel.findByIdAndDelete(id);
      return res.status(200).json({ mensagem: "Vídeo deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
