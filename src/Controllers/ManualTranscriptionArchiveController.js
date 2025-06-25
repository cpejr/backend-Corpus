import ArchivesModel from "../Models/ArchivesModel.js";
import { deleteArchive, getArchive, sendArchive } from "../Config/Aws.js";
import ManualTranscriptionArchiveModel from "../Models/ManualTranscriptionArchiveModel.js";
class ManualTranscriptionArchiveController {
  async createArchives(req, res) {
    try {
      const { ManualTranscriptionArchive, name } = req;

      const key = await sendArchive(ManualTranscriptionArchive, name);
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
      console.log(archives);
      const manualTranslation = await getArchive(archives.key);
      return res.status(200).json(manualTranslation);
    } catch (error) {
      throw error;
    }
  }

  async updateArchives(req, res) {
    try {
      const { id, ManualTranscriptionArchive, name } = req.body;
      await deleteArchive(id);
      const newArchives = await ManualTranscriptionArchiveModel.createArchives({
        ManualTranscriptionArchive,
        name,
      });

      return newArchives;
    } catch (error) {
      throw error;
    }
  }
}

export default new ManualTranscriptionArchiveController();
