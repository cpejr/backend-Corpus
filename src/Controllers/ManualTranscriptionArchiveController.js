import ManualTranscriptionArchiveModel from "../Models/ManualTranscriptionArchiveModel.js";
import { sendArchive, getSignedUrlForFile, deleteArchive } from "../Config/Aws.js";

class ManualTranscriptionArchiveController {
  async createArchives({ ManualTranscriptionArchive, name }) {
    try {
      const key = await sendArchive(
        ManualTranscriptionArchive.buffer,
        ManualTranscriptionArchive.originalname,
        ManualTranscriptionArchive.mimetype
      );
      const archives = await ManualTranscriptionArchiveModel.create({ key, name });
      return archives._id;
    } catch (error) {
      throw error;
    }
  }

  async getArchives(req, res) {
    try {
      const { id } = req.params;
      const archives = await ManualTranscriptionArchiveModel.findById(id);
      if (!archives) {
        return res.status(404).json({ message: "Manual transcription not found" });
      }

      const url = await getSignedUrlForFile(archives.key);

      return res.json({ url });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async updateArchives({ id, ManualTranscriptionArchive, name }) {
    try {
      const existing = await ManualTranscriptionArchiveModel.findById(id);
      if (!existing) throw new Error("Manual transcription archive not found");

      await deleteArchive(existing.key);

      const newArchiveId = await this.createArchives({
        ManualTranscriptionArchive,
        name,
      });

      return newArchiveId;
    } catch (error) {
      throw error;
    }
  }
}

export default new ManualTranscriptionArchiveController();
