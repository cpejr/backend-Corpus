import ArchivesModel from "../Models/ArchivesModel.js";
import {
  deleteArchive,
  getArchive,
  getVideoUrl,
  sendArchive,
} from "../Config/Aws.js";

class ArchiveController {
  async createArchives(req, res) {
    try {
      // Compatível com uso de req.files via multer
      const { name } = req.body;
      const thumbFile = req.files?.thumbFile?.[0];
      const videoFile = req.files?.videoFile?.[0];

      if (!thumbFile || !videoFile || !name) {
        return res.status(400).json({ message: "Missing required files or name" });
      }

      const thumbName = `T-${name}.webp`;
      const videoName = `${name}-${videoFile.originalname}`;

      const videoKey = await sendArchive(videoFile.buffer, videoName);
      const thumbKey = await sendArchive(
        thumbFile.buffer,
        thumbName,
        "image/webp"
      );

      const archives = await ArchivesModel.create({ videoKey, thumbKey, name });

      return res.status(201).json({ archiveId: archives._id });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error while creating archive", error: error.message });
    }
  }

  async getArchives(req, res) {
    try {
      const { id } = req.params;

      const archives = await ArchivesModel.findById(id);

      if (!archives) {
        throw new Error(`Archive with ID ${id} not found`);
      }

      const videoURL = await getVideoUrl(archives.videoKey);
      const thumbURL = await getVideoUrl(archives.thumbKey);
      const safeTitle = archives.name
        ? archives.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôÂÊÎÔãõÃÕçÇ_.-]/g, "")
        : "transcricao";
      const vttFileName = `${safeTitle}.vtt`;
      const vttURL = `/transcripts/${vttFileName}`;

      const data = {
        videoURL,
        thumbURL,
        vttURL,
      };

      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({
        message: "Error while fetching archive",
        error: error.message,
      });
    }
  }

  async deleteArchives(req, res) {
    try {
      const { id } = req.params;

      const archives = await ArchivesModel.findById(id);

      if (!archives) {
        throw new Error(`Archive with ID ${id} not found`);
      }

      await deleteArchive(archives.videoKey);
      await deleteArchive(archives.thumbKey);

      await ArchivesModel.findByIdAndDelete(id);

      return res.status(200).json({ message: "Archive deleted successfully" });
    } catch (error) {
      return res.status(500).json({
        message: "Error while deleting archive",
        error: error.message,
      });
    }
  }

  async updateArchives(req, res) {
    try {
      const { id } = req.body;
      const thumbFile = req.files?.thumbFile?.[0];
      const videoFile = req.files?.videoFile?.[0];
      const { name } = req.body;

      if (!thumbFile || !videoFile || !name || !id) {
        return res.status(400).json({ message: "Missing required data" });
      }

      await this.deleteArchives({ params: { id } }, res);

      req.body.name = name;
      req.files = { thumbFile: [thumbFile], videoFile: [videoFile] };
      return await this.createArchives(req, res);
    } catch (error) {
      return res.status(500).json({
        message: "Error while updating archive",
        error: error.message,
      });
    }
  }
}

export default new ArchiveController();
