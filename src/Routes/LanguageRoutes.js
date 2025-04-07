import express from "express";
import LanguageController from "../Controllers/LanguageController.js";
// import LanguageValidator from ?
// import verifyJWT from ?

const LanguageRoutes = express.Router();

LanguageRoutes.post("/", /*verifyJWT, LanguageValidator.create,*/ LanguageController.createLanguage);
LanguageRoutes.get("/" , LanguageController.getLanguageById);
LanguageRoutes.delete("/:id", /*verifyJWT, LanguageValidator.destroy,*/ LanguageController.deleteLanguage); // Perguntar para o gustavo

export default LanguageRoutes;
