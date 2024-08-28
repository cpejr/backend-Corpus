import bcrypt from 'bcrypt';
import UserModel from "../Models/UserModel.js";
import UserSessionTokenModel from "../Models/UserSessionTokenModel.js";
import { signSessionJwts } from "../Utils/general/jwt.js";
import { formatExpiresAt } from "../Utils/general/formatExpiresAt.js";
import { cookieAuthName, deleteCookieOptions, createCookieOptions } from "../Utils/general/CookieAuth.js";

class SessionController {

    async Login(req, res) {
      try {
        const { email, password, token } = req.body;

        const foundUser = await UserModel.findOne({ email }).select('+password');

        if (!foundUser) 
            return res.status(401).json({ message: "Usuário não existe. Realize o cadastro!" });
  
        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) 
            return res.status(401).json({ message: "E-mail ou senha incorreto" });
  
        if (token) {
            const foundToken = await UserSessionTokenModel.findOne({ token, });
            if (!foundToken)
                await UserSessionTokenModel.deleteMany({ user: foundUser._id });
            }
  
        const { createdAt, updatedAt, password: pass, ...tokenUserData } = foundUser;
  
        const { accessToken, refreshToken } = signSessionJwts(tokenUserData);
  
        const expiresAt = formatExpiresAt(process.env.REFRESH_TOKEN_EXPIRE); // in seconds

        await UserSessionTokenModel.create({
            user: foundUser._id,
            token: refreshToken,
            expiresAt,
        });

        return res.cookie(cookieAuthName, refreshToken, createCookieOptions).status(200).json({ accessToken });
      } catch (error) {
        res.status(500).json({ message: "ERRO!", error: error.message });
      }
    }

    async RefreshToken(req, res){
        try {
            const { oldRefreshToken } = req.signedCookies[cookieAuthName];
            res.clearCookie(cookieAuthName, deleteCookieOptions);

            if (!oldRefreshToken)
                return res.status(401).json({ message: "Token de refresh não fornecido" });

            const decoded = await decodeRefreshToken(oldRefreshToken);
            const foundToken = await UserSessionTokenModel.findOne({ token: oldRefreshToken }).exec();

            if (!foundToken) {
                const hackedUser = await UserModel.findOne({
                  _id: decoded.userId,
                }).exec();
        
                await UserSessionTokenModel.deleteMany({ user: hackedUser._id }).exec();
                return res.status(404).json({ message: "Reutilização de token" });
            }

            const userId = foundToken.user._id.toString();
            if (userId != decoded.userId) 
                return res.status(404).json({ message: "tampered token" });

            await foundToken.deleteOne();

            const { createdAt, updatedAt, password: pass, ...tokenUserData } = foundToken.user.toObject({ virtuals: true });

            const { accessToken, refreshToken } = signSessionJwts(tokenUserData);
            
            const expiresAt = formatExpiresAt(process.env.REFRESH_TOKEN_EXPIRE);

            await UserSessionTokenModel.create({
                user: userId,
                token: refreshToken,
                expiresAt,
            });
  
            return res.cookie(cookieAuthName, refreshToken, createCookieOptions).status(200).json({ accessToken });
        } catch (error) {
            res.status(500).json({ message: "Erro ao atualizar token", error: error.message });
        }
    }

    async Logout(req, res){
        try {
            const { token } = req.signedCookies[cookieAuthName];
            if(!token)
                return res.status(204).json({ message: "Operação realizada" });

            UserSessionTokenModel.findOneAndDelete({ token }).exec();

            return res.clearCookie(cookieAuthName, deleteCookieOptions).status(204);

        } catch (error) {
            res.status(500).json({ message: "ERRO!", error: error.message });
        }
    }
}

export default new SessionController();