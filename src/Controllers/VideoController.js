import VideosModel from "../Models/VideosModel.js";
import { NotFoundError } from "../Errors/baseErrors.js";
import { ForbiddenError } from "../Errors/baseErrors.js";

class VideosController {
  async InsertVideo(req, res) {
    try {
      const video = await VideosModel.create(req.body);

      return res.status(200).json(video);
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
  async GetVideo(req, res) {
    try {
      const video = await VideosModel.find();
      return res.status(200).json(video);
    } catch (error) {
      res.status(500).json({ message: "Not found", error: error.message });
    }
  }

  async DeleteVideo(req, res) {
    try {
      const { id } = req.params;

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Video deletado com sucesso!" });
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`));
    }
  }
}

export default new VideosController();
