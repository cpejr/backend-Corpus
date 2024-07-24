import CategoryModel from "../Models/CategoryModel.js";

class CategoryController {
async Create(req, res) {
    try {
      const video = await VideoModel.create(req.body);

      return res.status(200).json(video);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Não foi possível criar video", error: error.message });
    }
  }

  async Read(req, res) {
    try {
      const video = await VideoModel.find();
      return res.status(200).json(video);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Não foi possível ler video", error: error.message });
    }
  }

  async Update(req, res) {
    try {
      const { id } = req.params;
      const video = await VideoModel.findByIdAndUpdate(id, req.body, { new: true });

      return res.status(200).json(video);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Não foi possível atualizar video", error: error.message });
    }
  }
  async Delete(req, res) {
    try {
      const { id } = req.params;

      await VideoModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Video deletado com sucesso!" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Não foi possível deletar video", error: error.message });
    }
  }
}
export default new CategoryController();
