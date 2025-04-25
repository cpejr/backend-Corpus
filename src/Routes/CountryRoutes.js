import express from "express";
import CountryController from "../Controllers/CountryController.js";
// import CountryValidator from "../Validators/CountryValidator.js"; // opcional
// import verifyJWT from "../Middlewares/VerifyJwt.js"; // opcional

const CountryRoutes = express.Router();

CountryRoutes.post("/", /*verifyJWT, CountryValidator.create,*/ CountryController.createCountry);
CountryRoutes.post("/find", CountryController.getCountryFromBody);
CountryRoutes.get("/", CountryController.getAllCountries);
CountryRoutes.put("/:id", /*verifyJWT, CountryValidator.update,*/ CountryController.updateCountry);
CountryRoutes.delete("/:id", /*verifyJWT, CountryValidator.destroy,*/ CountryController.deleteCountry);

export default CountryRoutes;