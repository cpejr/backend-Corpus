import { generateThumb } from "../Utils/general/generateThumb.js";
import { generateTranscription } from "../Utils/general/generateTranscription.js";
import fs from "fs";
import path from "path";
import ArchivesController from "./ArchivesController.js";
import { convertToMinutes } from "../Utils/general/ConvertToMinutes.js";

import VideosModel from "../Models/VideosModel.js";
import CountryModel from "../Models/CountryModel.js";
import LanguageModel from "../Models/LanguageModel.js";
import ManualTranscriptionArchiveController from "./ManualTranscriptionArchiveController.js";
class VideosController {
  async Create(req, res) {
    try {
      const {
        title,
        language,
        videoFile,
        code,
        birthday,
        duration,
        country,
        totalParticipants,
        responsibles,
        context,
        ShortDescription,
      } = req.body;

      // const requiredFields = {
      //   title: "Title",
      //   language: "Language",
      //   videoFile: "Video file",
      //   code: "Code",
      //   country: "Country",
      //   totalParticipants: "Total participants",
      //   responsibles: "Responsibles",
      //   context: "Context",
      //   ShortDescription: "Short description",
      // };

      // const missingFields = Object.entries(requiredFields)
      //   .filter(([field]) => !req.body[field])
      //   .map(([_, name]) => name);

      // if (missingFields.length > 0) {
      //   return res.status(400).json({
      //     message: "Missing required fields!",
      //     missingFields,
      //   });
      // }

      const foundCode = await VideosModel.findOne({ code });
      if (foundCode) {
        return res.status(409).json({ message: "Code already registered!" });
      }

      const regex = /^data:(video\/)(\w+)(;base64,)(.+)$/;
      const matches = videoFile.match(regex);
      if (!matches) {
        return res.status(400).json({ message: "Invalid video format!" });
      }

      const dataType = matches[2];
      const videoFileData = matches[4];
      const videoBuffer = Buffer.from(videoFileData, "base64");
      if (videoBuffer.length === 0) {
        return res.status(400).json({ message: "Empty video file!" });
      }

      const videoPath = path.join("./src/Utils/database", `input.${dataType}`);
      await fs.promises.writeFile(videoPath, videoBuffer);

      const thumbFile = await generateThumb(videoPath);
      if (!thumbFile) {
        await fs.promises.unlink(videoPath);
        return res.status(500).json({ message: "Error generating thumbnail!" });
      }
      const safeTitle = title.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "");
      const archivesID = await ArchivesController.createArchives({
        thumbFile: thumbFile,
        videoFile: videoFileData,
        name: safeTitle,
      });

      const transcription = await generateTranscription(
        videoPath,
        language,
        title,
        totalParticipants
      );
      console.log("Transcription result:", transcription ? "Success" : "Failure");

      await fs.promises.unlink(videoPath).catch(console.error);

      const videoData = {
        title,
        language,
        code,
        archives: archivesID,
        transcription: transcription.transcription || "Transcription not available",

        transcriptURL: transcription.transcriptURL,
        srtURL: transcription.srtURL,

        duration: convertToMinutes(duration || 0),
        birthday: birthday || new birthday(),
        country,
        totalParticipants: Number(totalParticipants),
        responsibles,
        context,
        ShortDescription,
      };

      const video = await VideosModel.create(videoData);

      return res.status(201).json({
        message: "Video successfully created",
        video,
        thumbURL: thumbFile,
        transcription: transcription.transcription || "Transcription not available",
        transcriptURL: transcription.transcriptURL,
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

      if (!video || !video.archives || !video.archives.videoFile) {
        return res.status(404).json({ message: "Video not found" });
      }

      const base64 = video.archives.videoFile;
      const buffer = Buffer.from(base64, "base64");

      res.set({
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${video.title}.mp4"`,
      });

      return res.send(buffer);
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
        .populate("ManualTranscriptionArchive");

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

      if (country && Array.isArray(country)) {
        const countries = await CountryModel.find({
          name: { $in: country.map((c) => new RegExp(c, "i")) },
        });
        if (countries.length > 0) {
          filter.country = { $all: countries.map((c) => c._id) };
        } else {
          return res.status(404).json({ message: "Países não encontrados." });
        }
      }

      if (language && Array.isArray(language)) {
        const languages = await LanguageModel.find({
          name: { $in: language.map((l) => new RegExp(l, "i")) },
        });
        if (languages.length > 0) {
          filter.language = { $all: languages.map((l) => l._id) };
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

      const videos = await VideosModel.find(filter)
        .populate("archives")
        .populate("country")
        .populate("ManualTranscriptionArchive")
        .populate("language");

      return res.status(200).json(videos);
    } catch (error) {
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async UpdateVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);
      console.log(video);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      if (req.body?.ManualTranscriptionArchive) {
        if (video?.ManualTrasription) {
          const archivesID = await ManualTranscriptionArchiveController.updateArchives({
            id: video.ManualTranscriptionArchive,
            ManualTranscriptionArchive: req.body.ManualTranscriptionArchive,
            name: video.title,
          });
          video.ManualTranscriptionArchive = archivesID;
          await video.save();
        } else {
          const archivesID = await ManualTranscriptionArchiveController.createArchives({
            ManualTranscriptionArchive: req.body.ManualTranscriptionArchive,
            name: video.title,
          });
          video.ManualTranscriptionArchive = archivesID;
          await video.save();
        }
      }
      return res.status(200).json(video);
    } catch (error) {
      console.error("Error updating video:", error);
      return res.status(500).json({ message: "Error updating video" });
    }
  }

  async Destroy(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);

      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.archives) {
        await ArchivesController.deleteArchives(video.archives._id);
      }

      await VideosModel.findByIdAndDelete(id);
      return res.status(200).json({ message: "Video successfully deleted!" });
    } catch (error) {
      console.error("Error deleting video:", error);
      return res.status(500).json({ message: "Error deleting video" });
    }
  }
}

export default new VideosController();
