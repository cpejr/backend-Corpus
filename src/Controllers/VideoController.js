import { generateThumb } from "../Utils/general/generateThumb.js";
import { generateTranscription } from "../Utils/general/generateTranscription.js";
import fs from "fs";
import path from "path";
import ArchivesController from "./ArchivesController.js";
import { convertToMinutes } from "../Utils/general/ConvertToMinutes.js";
import ManualTranscriptionArchiveController from "./ManualTranscriptionArchiveController.js";
import VideosModel from "../Models/VideosModel.js";
import CountryModel from "../Models/CountryModel.js";
import LanguageModel from "../Models/LanguageModel.js";
import { sendArchive } from "../Config/Aws.js";
import TranscriptionModel from "../Models/TranscriptionModel.js";
import ArchivesModel from "../Models/ArchivesModel.js";
class VideosController {
  async Create(req, res) {
    try {
      const {
        title,
        language,
        code,
        birthday,
        duration,
        country,
        totalParticipants,
        responsibles,
        context,
        ShortDescription,
      } = req.body;
      const file = req.file;

      const requiredFields = {
        title: "Title",
        language: "Language",
        code: "Code",
        country: "Country",
        totalParticipants: "Total participants",
        responsibles: "Responsibles",
        context: "Context",
        ShortDescription: "Short description",
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([field]) => !req.body[field])
        .map(([_, name]) => name);

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: "Missing required fields!",
          missingFields,
        });
      }

      if (!file) {
        return res.status(400).json({ message: "Arquivo não enviado" });
      }

      const foundCode = await VideosModel.findOne({ code });
      if (foundCode) {
        return res.status(409).json({ message: "Code already registered!" });
      }

      const tempDir = path.join(process.cwd(), "temp");
      await fs.promises.mkdir(tempDir, { recursive: true });

      const safeFileName = file.originalname
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9.\-_]/g, "");

      const tempPath = path.join(tempDir, safeFileName);
      await fs.promises.writeFile(tempPath, file.buffer);

      const videoS3Key = await sendArchive(file.buffer, file.originalname, file.mimetype);
      console.log("Key AWS vídeo:", videoS3Key);

      const thumbFile = await generateThumb(tempPath);
      if (!thumbFile) {
        await fs.promises.unlink(tempPath);
        return res.status(500).json({ message: "Error generating thumbnail!" });
      }

      const safeTitle = title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "");

      async function createArchiveHelper({ thumbFile, videoFile, name }) {
        //tava dando erro na requisicao antes entao coloquei internamente
        if (!thumbFile || !videoFile || !name)
          //tive medo de dar problema em mais algum lugar no codigo
          throw new Error("Missing required files or name");

        const thumbName = `T-${name}.webp`;
        const videoName = `${name}-${videoFile.originalname}`;

        const videoKey = await sendArchive(videoFile.buffer, videoName);
        const thumbKey = await sendArchive(thumbFile.buffer, thumbName, "image/webp");

        const archive = await ArchivesModel.create({ videoKey, thumbKey, name });

        return archive._id;
      }

      const archivesID = await createArchiveHelper({
        thumbFile,
        videoFile: file,
        name: safeTitle,
      });

      const languageData = await LanguageModel.findById(language);
      if (!languageData) {
        await fs.promises.unlink(tempPath).catch(console.error);
        return res.status(400).json({ message: "Invalid language ID" });
      }

      const langValue = languageData.code || languageData.name;

      const transcriptionResult = await generateTranscription(tempPath, langValue, title);

     if(!transcriptionResult.pdfS3Key){
      throw new Error("Error generating transcription");
     }

      const transcriptionDoc = await TranscriptionModel.create({
       name: title || "Unnamed transcription",
        Key: transcriptionResult.pdfS3Key  
      });
      console.log("Key AWS PDF transcrição:", transcriptionResult.pdfS3Key);

      await fs.promises.unlink(tempPath).catch(console.error);

      const videoData = {
        title,
        language: [language],
        code,
        archives: archivesID,
        transcription: transcriptionDoc._id,
        srtURL: transcriptionResult.srtURL,
        duration: convertToMinutes(duration || 0),
        birthday: birthday || new Date(),
        country: Array.isArray(country) ? country : [country],
        totalParticipants: Number(totalParticipants),
        responsibles,
        context,
        ShortDescription,
        videoKey: videoS3Key,
      };

      const video = await VideosModel.create(videoData);

      return res.status(201).json({
        message: "Video successfully created",
        video,
        thumbURL: thumbFile,
        transcription: transcriptionResult.transcription || "Transcription not available",
        transcriptURL: transcriptionResult.transcriptURL,
      });
    } catch (error) {
      console.error("Server error:", {
        message: error.message,
        stack: error.stack,
        body: req.body,
      });
      return res.status(500).json({
        message: "Server error",
        error: error.message,
        details: error.errors,
      });
    }
  }

  async DownloadVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);

      const s3Stream = await getArchive(video.videoKey);
      res.set({
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${video.title}.mp4"`,
      });

      s3Stream.pipe(res);

      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
    } catch (error) {
      console.error("Error downloading video:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async GetVideo(req, res) {
    try {
      const video = await VideosModel.find()
        .populate("archives")
        .populate("language")
        .populate("country")
        .populate("ManualTranscriptionArchive")
        .populate("transcription");

      return res.status(200).json(video);
    } catch (error) {
      return res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async GetVideoByParameters(req, res) {
    try {
      console.log(req.query);
      const { totalParticipants, birthday, duration, country, language } = req.query;
      let filter = {};

      if (totalParticipants) {
        const [Min, Max] = totalParticipants.split("-");

        if (Min === "10" && Max === "mais") {
          filter.totalParticipants = { $gte: 11 };
        } else {
          const min = Number(Min);
          const max = Number(Max);
          if (min && max) {
            filter.totalParticipants = { $gte: min, $lte: max };
          } else if (min) {
            filter.totalParticipants = { $gte: min };
          }
        }
      }

      if (country && Array.isArray(country)) {
        const countries = await CountryModel.find({
          _id: { $in: country },
        });
        if (countries.length > 0) {
          filter.country = { $in: countries.map((c) => c._id) };
        } else {
          return res.status(404).json({ message: "Países não encontrados." });
        }
      }
      if (language && Array.isArray(language)) {
        const languages = await LanguageModel.find({
          _id: { $in: language },
        });
        if (languages.length > 0) {
          filter.language = { $in: languages.map((l) => l._id) };
        } else {
          return res.status(404).json({ message: "Idiomas não encontrados." });
        }
      }

      if (birthday) {
        filter.birthday = { $eq: new Date(birthday) };
      }

      if (duration) {
        filter.duration = { $eq: Number(duration) };
      }

      const videos = await VideosModel.find(filter)
        .populate("archives")
        .populate("country")
        .populate("language")
        .populate("ManualTranscriptionArchive");

      console.log("Filtros aplicados:", JSON.stringify(filter, null, 2));

      return res.status(200).json(videos);
    } catch (error) {
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async UpdateVideo(req, res) {
    try {
      const { id } = req.params;

      if (req.body.country && Array.isArray(req.body.country)) {
        req.body.country = req.body.country.map((c) => {
          if (typeof c === "object") return c._id || c.value;
          return c;
        });
      }

      if (req.body.language && Array.isArray(req.body.language)) {
        req.body.language = req.body.language.map((l) => {
          if (typeof l === "object") return l._id || l.value;
          return l;
        });
      }

      const updatedVideo = await VideosModel.findByIdAndUpdate(id, req.body, {
        new: true,
      })
        .populate("archives")
        .populate("ManualTranscriptionArchive");

      if (!updatedVideo) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (req.file) {
        let archivesID;
        if (updatedVideo?.ManualTranscriptionArchive) {
          archivesID = await ManualTranscriptionArchiveController.updateArchives({
            id: updatedVideo.ManualTranscriptionArchive,
            ManualTranscriptionArchive: req.file,
            name: updatedVideo.title,
          });
        } else {
          archivesID = await ManualTranscriptionArchiveController.createArchives({
            ManualTranscriptionArchive: req.file,
            name: updatedVideo.title,
          });
        }

        updatedVideo.ManualTranscriptionArchive = archivesID;
        await updatedVideo.save();
        console.log("Transcrição manual associada ao vídeo:", archivesID);
      } else {
        console.log("Nenhuma transcrição manual enviada.");
      }

      return res.status(200).json(updatedVideo.toObject());
    } catch (error) {
      console.error("Error updating video:", error);
      return res.status(500).json({ message: "Error updating video" });
    }
  }

  async Destroy(req, res) {
    try {
      const { id } = req.params;
      console.log(`[Destroy] Recebido id: ${id}`);

      const video = await VideosModel.findById(id);
      console.log("[Destroy] Vídeo buscado no banco:", video);

      if (!video) {
        console.log("[Destroy] Vídeo não encontrado.");
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.archives) {
        console.log("[Destroy] Chamando deleteArchives com id:", video.archives._id);
        await ArchivesController.deleteArchives(
          { params: { id: video.archives._id } },
          {
            status: (code) => {
              console.log(`[deleteArchives] status chamado com código: ${code}`);
              return {
                json: (obj) => console.log("[deleteArchives] json chamado com:", obj),
              };
            },
            json: (obj) => console.log("[deleteArchives] json chamado com:", obj),
          }
        );
        console.log("[Destroy] deleteArchives finalizado");
      } else {
        console.log("[Destroy] Nenhum arquivo de archive associado.");
      }

      await VideosModel.findByIdAndDelete(id);
      console.log("[Destroy] Vídeo deletado do banco");

      return res.status(200).json({ message: "Video successfully deleted!" });
    } catch (error) {
      console.error("[Destroy] Error deleting video:", error);
      return res.status(500).json({ message: "Error deleting video" });
    }
  }
}

export default new VideosController();
