import VideosModel from "../Models/VideosModel.js";

class VideosController {
  async Create(req, res) {
    try {
    // objeto que chega { title, description, videoData, code, context, responsible, totalParticipants, country, language, duration, date } - falta tirar videoFile e gerar video, thumbnail e transcription

    const { videoFile, code } = req.body;

    const foundCode = await VideosModel.findOne({ code, });
    if (foundCode) {
      return res.status(409).json({ message: "Código já cadastrado!" });
    }

    

    const foundVideo = await VideosModel.findOne({ video, });
    if (foundVideo) {
      return res.status(409).json({ message: "Código já cadastrado!" });
    }
      
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

  async Destroy(req, res) {
    try {
      const { id } = req.params;

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Video deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Forbidden route", error: error.message });
    }
  }
}

export default new VideosController();
