import express from "express";
import LanguageController from "../Controllers/LanguageController.js";
// import LanguageValidator from "../Validators/LanguageValidator.js";  // Caso precise de validação de dados
// import verifyJWT from "../Middleware/verifyJWT.js";  // Caso precise de autenticação JWT

const LanguageRoutes = express.Router();

// Rota para criar um novo idioma
LanguageRoutes.post("/", /*verifyJWT, LanguageValidator.create,*/ LanguageController.createLanguage);

// Rota para buscar um idioma específico com base no body (id, name ou code)
LanguageRoutes.post("/find", LanguageController.getLanguageFromBody);

// Rota para buscar todos os idiomas
LanguageRoutes.get("/", LanguageController.getAllLanguages);  // Nova rota para listar todos os idiomas

// Rota para deletar um idioma (verificar autorização antes)
LanguageRoutes.delete("/:id", /*verifyJWT, LanguageValidator.destroy,*/ LanguageController.deleteLanguage);

export default LanguageRoutes;
