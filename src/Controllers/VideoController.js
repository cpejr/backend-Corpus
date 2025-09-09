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
import { deleteArchive, sendArchive, getSignedUrlForFile } from "../Config/Aws.js";
import TranscriptionModel from "../Models/TranscriptionModel.js";
import ArchivesModel from "../Models/ArchivesModel.js";
import mongoose from "mongoose";
import ManualTranscriptionArchiveModel from "../Models/ManualTranscriptionArchiveModel.js";

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

    const thumbFile = await generateThumb(tempPath);
    if (!thumbFile) {
      await fs.promises.unlink(tempPath);
      return res.status(500).json({ message: "Error generating thumbnail!" });
    }

    const safeTitle = title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "");

    const archiveRequest = {
      body: { name: safeTitle },
      files: {
        thumbFile: [thumbFile],
        videoFile: [file]
      }
    };
    

    let archivesID;
    const archiveResponse = {
      status: () => ({
        json: (data) => {
          if (data.archiveId) {
            archivesID = data.archiveId;
          } else {
            throw new Error(data.message || "Error creating archive");
          }
        }
      })
    };

    await ArchivesController.createArchives(archiveRequest, archiveResponse);

    const languageData = await LanguageModel.findById(language);
    if (!languageData) {
      await fs.promises.unlink(tempPath).catch(() => {});
      return res.status(400).json({ message: "Invalid language ID" });
    }

    const langValue = languageData.code || languageData.name;

    const videoData = {
      title,
      language: [language],
      code,
      archives: archivesID,
      transcription: null,
      transcriptURL: null,
      srtURL: null,
      duration: convertToMinutes(duration || 0),
      birthday: birthday || new Date(),
      country: Array.isArray(country) ? country : [country],
      totalParticipants: Number(totalParticipants),
      responsibles,
      context,
      ShortDescription,

    };

    const Video = await VideosModel.create(videoData);

    res.status(201).json({
      message: "Video successfully created",
      video: Video,
      thumbURL: thumbFile,
    });

    //teste para o pull request
    setImmediate(async () => {
      try {
        const transcriptionResult = await generateTranscription(
          tempPath,
          langValue,
          title,
          totalParticipants
        );

        if (transcriptionResult.pdfS3Key && transcriptionResult.vttS3Key) {
          const transcriptionDoc = await TranscriptionModel.create({
            name: title || "Unnamed transcription",
            Key: transcriptionResult.pdfS3Key,
          });



          await VideosModel.findByIdAndUpdate(Video._id, {
            transcription: transcriptionDoc._id,
            transcriptURL: transcriptionResult.transcriptURL,
            srtURL: transcriptionResult.srtURL,
            vttS3Key: transcriptionResult.vttS3Key,
          });


        } else {

        }
      } catch (error) {

      } finally {
        await fs.promises.unlink(tempPath).catch(() => {});
      }
    });
  } catch (error) {

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

      if (!video) return res.status(404).json({ message: "Video not found" });

      const archives = await ArchivesModel.findById(video.archives);
      if (!archives) return res.status(404).json({ message: "Archives not found" });
      
      const s3Stream = await getArchive(archives.videoKey);
      res.set({
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${video.title}.mp4"`,
      });

      s3Stream.pipe(res);
    } catch (error) {

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

  async getVTTUrl(req, res) {
    try{
      const { id } = req.params;
      const video = await VideosModel.findById(id);
      if(!video){
        return res.status(404).json({message: "Video not found"});
      }
      if(!video.vttS3Key){
        return res.status(404).json({message: "VTT Subtitles not found"});
      }
      const signedUrl = await getSignedUrlForFile(video.vttS3Key, 3600);
      return res.status(200).json({url: signedUrl});
    } catch (error) {
      return res.status(500).json({
        message:"Could not generate VTT URL",
        error: error.message
      });
    }
  }

  async GetVideoByParameters(req, res) {
    try {

      const { totalParticipants, birthday, duration, country, language } = req.query;
      let filter = {};

      // ===== Filtros AWS Merge =====
      if (totalParticipants) {
        const [Min, Max] = totalParticipants.split("-");
        if (Min === "10" && Max === "mais") {
          filter.totalParticipants = { $gte: 11 };
        } else {
          const min = Number(Min);
          const max = Number(Max);
          if (min && max) filter.totalParticipants = { $gte: min, $lte: max };
          else if (min) filter.totalParticipants = { $gte: min };
        }
      }

      if (country && Array.isArray(country)) {
        const countries = await CountryModel.find({ _id: { $in: country } });
        if (countries.length > 0) filter.country = { $in: countries.map((c) => c._id) };
        else return res.status(404).json({ message: "Países não encontrados." });
      }

      if (language && Array.isArray(language)) {
        const languages = await LanguageModel.find({ _id: { $in: language } });
        if (languages.length > 0) filter.language = { $in: languages.map((l) => l._id) };
        else return res.status(404).json({ message: "Idiomas não encontrados." });
      }

      if (birthday) filter.birthday = { $gte: new Date(birthday) };
      if (duration) filter.duration = { $gte: Number(duration) };

      const videos = await VideosModel.find(filter)
        .populate("archives")
        .populate("country")
        .populate("language")
        .populate("ManualTranscriptionArchive");


      return res.status(200).json(videos);
    } catch (error) {
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async UpdateVideo(req, res) {
    try {
      const { id } = req.params;

      if ("transcription" in req.body) delete req.body.transcription;

      if (req.body.transcription) {
        const transcription = req.body.transcription;
        const isValid = mongoose.Types.ObjectId.isValid(transcription);
        if (!isValid || transcription === "Transcription error") delete req.body.transcription;
      }

      if (req.body.country && Array.isArray(req.body.country)) {
        req.body.country = req.body.country.map((c) =>
          typeof c === "object" ? c._id || c.value : c
        );
      }
      if (req.body.language && Array.isArray(req.body.language)) {
        req.body.language = req.body.language.map((l) =>
          typeof l === "object" ? l._id || l.value : l
        );
      }

      const updatedVideo = await VideosModel.findByIdAndUpdate(id, req.body, {
        new: true,
      })
        .populate("archives")
        .populate("ManualTranscriptionArchive");

      if (!updatedVideo) return res.status(404).json({ message: "Video not found" });

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

      }


      return res.status(200).json(updatedVideo.toObject());
    } catch (error) {

      return res.status(500).json({ message: "Error updating video", error: error.message });
    }
  }

  async Destroy(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);

      if (!video) return res.status(404).json({ message: "Video not found" });

      const manualtranscription = video.ManualTranscriptionArchive;

      if (video.archives) {

        await ArchivesController.deleteArchives(
          { params: { id: video.archives._id } },
          {
            status: (code) => ({ json: (obj) => {} }),
            json: (obj) => {},
          }
        );

        const archives = await ArchivesModel.findById(video.archives);
        if (archives) {
          await deleteArchive(archives.videoKey);
        }
      }

      await VideosModel.findByIdAndDelete(id);

      if (manualtranscription) {
        const manualtranscriptionarchive = await ManualTranscriptionArchiveModel.findById(
          manualtranscription
        );
        if (manualtranscriptionarchive) {
          await deleteArchive(manualtranscriptionarchive.key);
          await ManualTranscriptionArchiveModel.findByIdAndDelete(manualtranscription);
        }
      }

      return res.status(200).json({ message: "Video successfully deleted!" });
    } catch (error) {

      return res.status(500).json({ message: "Error deleting video" });
    }
  }
}

export default new VideosController();

