import VideosModel from "../Models/VideosModel.js";
import CountryModel from "../Models/CountryModel.js";  // Importando o modelo de país
import LanguageModel from "../Models/LanguageModel.js";  // Importando o modelo de idioma

class VideosController {
  // Função de criação de vídeo
  async Create(req, res) {
    try {
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

      let transcription = "placegolder"
      await fs.promises.unlink(videoPath);
      
      let newVideo = req.body;
      delete newVideo.videoFile;

      newVideo = { ...newVideo, archives: archivesID, transcription: transcription ,duration:convertToMinutes(req.body.duration) };
      delete newVideo.description
      delete newVideo.responsible

      try {
        const video = await VideosModel.create(newVideo);
        return res.status(200).json(video);
      } catch(err) {
        console.log(err)
      }

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



  // Função para buscar vídeos com base nos parâmetros
  async GetVideoByParameters(req, res) {
    try {
      const { totalParticipants, dates, duration, country, language } = req.query.filters || {};  // Recebe os filtros da query
      let filter = {};

      // Filtro para número de participantes
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
        const countryDoc = await CountryModel.findOne({ name: { $regex: new RegExp(country, "i") } });  // Buscando pelo nome do país
        if (countryDoc) {
          filter.country = countryDoc._id;  // Adiciona o ObjectId do país ao filtro
        } else {
          return res.status(404).json({ message: "País não encontrado." });
        }
      }

      // Buscar o ObjectId do idioma pelo nome (passado como string)
      if (language) {
        const languageDoc = await LanguageModel.findOne({ name: { $regex: new RegExp(language, "i") } });  // Buscando pelo nome do idioma
        if (languageDoc) {
          filter.language = languageDoc._id;  // Adiciona o ObjectId do idioma ao filtro
        } else {
          return res.status(404).json({ message: "Linguagem não encontrada." });
        }
      }

      if (dates) {
        filter.date = { $gte: new Date(dates) };
      }

      if (duration) {
        filter.duration = { $gte: Number(duration) };
      }

      // Log para verificar o filtro gerado
      console.log('Filtro aplicado:', filter);

      // Buscando vídeos com o filtro gerado
      const videos = await VideosModel.find(filter)
        .populate('country')   // Popula o campo country com os dados do país
        .populate('language'); // Popula o campo language com os dados do idioma

      return res.status(200).json(videos);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  // Outras funções (Update, Delete)
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
      console.log(video.archives._id);
      await ArchivesController.deleteArchives(video.archives?._id);

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Vídeo deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
