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
    if (error) {
      return res.status(403).json({ message: "Jwt token é inválido" });
    }
    req.userId = user.userFound._id;
    req.userType = user.userFound.type;

    next();
  });
}

export default verifyJwt;
