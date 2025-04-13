import CategoryModel from "../Models/CategoryModel.js";
import { NotFoundError } from "../Errors/baseErrors.js";
import { ForbiddenError } from "../Errors/baseErrors.js";

class CategoryController {
  // Função para criar uma categoria
  async Create(req, res, next) {
    try {
      const category = await CategoryModel.create(req.body);

      return res.status(200).json(category);
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`)); // Passa para o middleware de erro
    }
  }

  // Função para ler categorias
  async Read(req, res, next) {
    try {
      const category = await CategoryModel.find();
      return res.status(200).json(category);
    } catch (error) {
      next(new NotFoundError(`Route '${req.baseUrl}' not found`)); // Passa para o middleware de erro
    }
  }

  // Função para atualizar uma categoria
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

  // Função para deletar uma categoria
  async Delete(req, res, next) {
    try {
      const { id } = req.params;

      await CategoryModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Categoria deletada com sucesso!" });
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`)); // Passa para o middleware de erro
    }
  }
}

export default new CategoryController();
