import UserModel from "../Models/UserModel.js";
import UserPwdTokenModel from "../Models/UserPwdTokenModel.js";
import { signForgotPasswordJwt } from "../Utils/general/jwt.js";
import * as EmailHandler from "../Utils/mail/handlers.js"

class UserController {

  async Create(req, res) {
    try {
      const user = await UserModel.create(req.body);

      const { password, ...newUser } = user.toObject();

      return res.status(200).json(newUser);
    } catch (error) {
      res.status(500).json({ message: "ERRO!", error: error.message });
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

  async ForgotPassword(req, res) {
    try {
      const { email } = req.body;

      const foundUser = await UserModel.findOne({ email, });
      if (!foundUser) 
        return res.status(404).json({ message: "Usuário não encontrado" });

      const passwordToken = signForgotPasswordJwt(foundUser._id);

      await UserPwdTokenModel.deleteMany({ user: foundUser._id }).exec();
      await UserPwdTokenModel.create({
        user: foundUser._id,
        token: passwordToken,
      });

      await EmailHandler.redefinePasswordEmail({
        user: foundUser,
        passwordToken,
      });

      return res.status(200).json({ mensagem: "E-mail de recuperação enviado com sucesso!" });

    } catch (error) {
      res.status(500).json({ message: "ERRO!", error: error.message });
    }
  }

  async RedifinePassword(req, res){
    try {
      const { newPassword } = req.body;
      const { token } = req.params;

      const { userId } = await decodeForgotPasswordToken(token);

      const [foundUser, foundToken] = await Promise.all([
        UserModel.findById(userId).exec(),
        UserPwdTokenModel.findOne({ token }).exec(),
      ]);

      if (!foundUser) 
        return res.status(404).json({ message: "Usuário não encontrado" });
      if (!foundToken) 
        return res.status(403).json({ message: "Token expirado ou não encontrado" });
      if (userId !== foundToken.user.toString())
        return res.status(403).json({ message: "Token adulterado" });

      await foundToken.deleteOne();

      const updatedUser = foundUser.set({ password: newPassword }).save();
      
      return res.status(200).json({ mensagem: "Senha alterada com sucesso!" });

    } catch (error) {
      res.status(500).json({ message: "ERRO!", error: error.message });
    }
  }

}
  

export default new UserController();
