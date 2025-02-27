import ArchivesModel from "../Models/ArchivesModel.js";
import { deleteArchive, getArchive, sendArchive } from "../Config/Aws.js";

class ArchiveController {
    async createArchives(req, res){
        try {

            const { thumbFile, videoFile, name } = req;
            const thumbName = `$T-${name}`;
            const videoKey = await sendArchive(videoFile, name);
            const thumbKey = await sendArchive(thumbFile, thumbName);
            const archives = await ArchivesModel.create({ videoKey, thumbKey, name });

            return archives._id;

        } catch (error) {
            throw error;
        }
    }

    async getArchives(req, res) {
        try {
            const {id} = req.params;
            
            const archives = await ArchivesModel.findById(id);

            if (!archives) {
                throw new Error(`Archive with ID ${id} not found`);
            }

            const videoFile = await getArchive(archives.videoKey);
            const thumbFile = await getArchive(archives.thumbKey);
            const data = { videoFile, thumbFile }
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

            await this.deleteArchives(id);
            const newArchives = await this.createArchives({ thumbFile, videoFile, name });

            return newArchives;

        } catch (error) {
            throw error;
        }
    }
}

export default new ArchiveController();