import UserModel from "../Models/UserModel.js";
import jwt from "jsonwebtoken";

class UserController{
    async Login(req, res){
	
    }
    async Create(req, res){
	try {
     		const user = await UserModel.create(req.body);

      		return res.status(200).json(user);
    	} catch (error) {
      		res.status(500).json({ message: "Não foi possível criar usuario", error: error.message });
    	}
    }
    async Read(req, res){
	try {
      		const user = await UserModel.find();
      		return res.status(200).json(user);
    	} catch (error) {
     		res.status(500).json({ message: "Não foi possível ler usuario", error: error.message });
    	}
    }
    async Update(req, res) {
    	try {
      		const { id } = req.params;
      		const usuario = await UserModel.findByIdAndUpdate(id, req.body, { new: true });

     		return res.status(200).json(eventos);
    	} catch (error) {
      		res.status(500).json({ message: "Não foi possível atualizar usuario", error: error.message });
    	}
  }
  async Destroy(req, res) {
    try {
      const { id } = req.params;

      await UserModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Usuarip deletado com sucesso!" });
    } catch (error) {
      res.status(500).json({ message: "Não foi possível deletar usuário", error: error.message });
    }
  }
}

export default new UserController();
