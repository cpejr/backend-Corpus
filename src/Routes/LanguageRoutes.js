import express from "express";
import LanguageController from "../Controllers/LanguageController.js";
// import LanguageValidator from "../Validators/LanguageValidator.js";  // Caso precise de validação de dados
// import verifyJWT from "../Middleware/verifyJWT.js";  // Caso precise de autenticação JWT

const LanguageRoutes = express.Router();

// Rota para criar um novo idioma
LanguageRoutes.post("/", /*verifyJWT, LanguageValidator.create,*/ LanguageController.createLanguage);


LanguageRoutes.post("/find", LanguageController.getLanguageFromBody);


LanguageRoutes.get("/", LanguageController.getAllLanguages); 


LanguageRoutes.delete("/:id", /*verifyJWT, LanguageValidator.destroy,*/ LanguageController.deleteLanguage);

export default LanguageRoutes;
