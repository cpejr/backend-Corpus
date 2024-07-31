import CategoryModel from "../Models/CategoryModel.js";
import { NotFoundError } from "../Errors/baseErrors.js";
import { ForbiddenError } from "../Errors/baseErrors.js";

class CategoryController {
  async Create(req, res) {
    try {
      const category = await CategoryModel.create(req.body);

      return res.status(200).json(category);
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`));
      //res.status(500).json({ message: "Não foi possível criar categoria", error: error.message });
    }
  }

  async Read(req, res) {
    try {
      const category = await CategoryModel.find();
      return res.status(200).json(category);
    } catch (error) {
      next(new NotFoundError(`Route '${req.baseUrl}' not found`));
      //res.status(500).json({ message: "Não foi possível ler categoria", error: error.message });
    }
  }

  async Update(req, res) {
    try {
      const { id } = req.params;
      const category = await CategoryModel.findByIdAndUpdate(id, req.body, { new: true });

      return res.status(200).json(category);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Não foi possível atualizar categoria", error: error.message });
    }
  }
  async Delete(req, res) {
    try {
      const { id } = req.params;

      await CategoryModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Categoria deletado com sucesso!" });
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`));
      //res.status(500).json({ message: "Não foi possível deletar categoria", error: error.message });
    }
  }
}
export default new CategoryController();
