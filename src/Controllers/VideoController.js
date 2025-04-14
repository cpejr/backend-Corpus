import VideosModel from "../Models/VideosModel.js";
import CountryModel from "../Models/CountryModel.js"; 
import LanguageModel from "../Models/LanguageModel.js"; 
import { buildVideoFilters } from "./FilterController.js"; 

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
  
      // Garantir que os filtros estejam sendo passados corretamente
      if (!filters) {
        return res.status(400).json({ message: "Filtros não fornecidos." });
      }
  
      // Chamar buildVideoFilters para criar o filtro final
      const filterObject = await buildVideoFilters(filters);
  
      // Se o filtro for vazio ou nulo, retorna todos os vídeos
      if (!filterObject || Object.keys(filterObject).length === 0) {
        const videos = await VideosModel.find()
          .populate("language")
          .populate("country");
        return res.status(200).json(videos);
      }
  
      // Log para depuração
      console.log("Filtro gerado:", filterObject);
  
      // Consultar vídeos no banco aplicando os filtros gerados
      const videos = await VideosModel.find(filterObject)
        .populate("language")
        .populate("country");
  
      // Verificar se algum vídeo foi encontrado
      if (!videos || videos.length === 0) {
        return res.status(404).json({ message: "Nenhum vídeo encontrado com os filtros aplicados." });
      }
  
      // Retornar os vídeos encontrados
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
      await ArchivesController.deleteArchives(video.archives?._id);
      await VideosModel.findByIdAndDelete(id);
      return res.status(200).json({ mensagem: "Vídeo deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
