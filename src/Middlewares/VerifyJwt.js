import jwt from "jsonwebtoken";

function verifyJwt(req, res, next) {
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
  if (!authHeader) {
    return res.status(403).json({ message: "Header de autorização não encontrado" });
  }
  const [bearer, token] = authHeader.split(" ");

  if (!/^Bearer$/.test(bearer)) {
    return res.status(403).json({ message: "Header de autorização mal formatado" });
  }

  if (!token) {
    return res.status(403).json({ message: "Jwt token não encontrado" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error && token != process.env.JWT_SECRET) {
      console.log(process.env.JWT_SECRET);
      return res.status(403).json({ message: "Jwt token é inválido" });
    }

    // Lógica de login ainda não está pronta
    //req.userId = user._id;
    //req.userType = user.type;

    next();
  });
}

export default verifyJwt;
