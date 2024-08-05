import UserModel from "../Models/UserModel.js";
import jwt from "jsonwebtoken";
import { NotFoundError } from "../Errors/baseErrors.js";
import { ForbiddenError } from "../Errors/baseErrors.js";

class UserController {
  async Login(req, res) {}

  async Create(req, res) {
    try {
      const user = await UserModel.create(req.body);

      return res.status(200).json(user);
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`));
    }
  }
  async Read(req, res) {
    try {
      const user = await UserModel.find();
      return res.status(200).json(user);
    } catch (error) {
      next(new NotFoundError(`Route '${req.baseUrl}' not found`));
    }
  }
  async Update(req, res) {
    try {
      const { id } = req.params;
      const usuario = await UserModel.findByIdAndUpdate(id, req.body, { new: true });

      return res.status(200).json(eventos);
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`));
    }
  }
  async Destroy(req, res) {
    try {
      const { id } = req.params;

      await UserModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Usuario deletado com sucesso!" });
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`));
    }
  }
}

export default new UserController();
