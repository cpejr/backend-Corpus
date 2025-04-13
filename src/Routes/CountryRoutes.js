import express from "express";
import CountryController from "../Controllers/CountryController.js";
// import CountryValidator from "../Validators/CountryValidator.js"; // opcional
// import verifyJWT from "../Middlewares/VerifyJwt.js"; // opcional

const CountryRoutes = express.Router();

// Rota para criar um novo país
CountryRoutes.post("/", /*verifyJWT, CountryValidator.create,*/ CountryController.createCountry);

// Rota para buscar um país específico com base no body (id, name ou code)
CountryRoutes.post("/find", CountryController.getCountryFromBody);

// Rota para buscar todos os países
CountryRoutes.get("/", CountryController.getAllCountries);  // Nova rota para listar todos os países

// Rota para atualizar um país
CountryRoutes.put("/:id", /*verifyJWT, CountryValidator.update,*/ CountryController.updateCountry);

// Rota para deletar um país
CountryRoutes.delete("/:id", /*verifyJWT, CountryValidator.destroy,*/ CountryController.deleteCountry);

export default CountryRoutes;
