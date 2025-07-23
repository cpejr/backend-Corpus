import ArchivesModel from "../Models/ArchivesModel.js";
import { deleteArchive, getArchive, getVideoUrl, sendArchive } from "../Config/Aws.js";

class ArchiveController {
  async createArchives(req, res) {
    try {
      const { thumbFile, videoFile, name } = req;
      const thumbName = `T-${name}.webp`;
      const videoName = `${name}-${videoFile.originalname}`;
      const videoKey = await sendArchive(videoFile.buffer, videoName);
      const thumbKey = await sendArchive(thumbFile.buffer, thumbName, "image/webp");
      const archives = await ArchivesModel.create({ videoKey, thumbKey, name });
      return archives._id;
    } catch (error) {
      throw error;
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
      return res
        .status(500)
        .json({ message: "Error while fetching archive", error: error.message });
    }
  }

  async deleteArchives(req, res) {
    try {
      const id = req;

      const archives = await ArchivesModel.findById(id);

      if (!archives) {
        throw new Error(`Archive with ID ${id} not found`);
      }

      await deleteArchive(archives.videoKey);
      await deleteArchive(archives.thumbKey);

      await ArchivesModel.findByIdAndDelete(id);
    } catch (error) {
      throw error;
    }
  }

  async updateArchives(req, res) {
    try {
      const { id, thumbFile, videoFile, name } = req.body;

      await ArchivesModel.deleteArchives(id);
      const newArchives = await ArchivesModel.createArchives({ thumbFile, videoFile, name });

      return newArchives;
    } catch (error) {
      throw error;
    }
  }
}

export default new ArchiveController();
