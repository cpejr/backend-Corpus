import CategoryValidator from "../Validators/CategoryValidator.js";
import CategoryController from "../Controllers/CategoryController.js";
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";

const CategoryRoutes  = express.Router();

CategoryRoutes.post("/", verifyJWT, CategoryValidator.create, CategoryController.Create);

CategoryRoutes.get("/", verifyJWT, CategoryController.Read);

CategoryRoutes.delete("/:id", verifyJWT, CategoryValidator.destroy, CategoryController.Delete);

CategoryRoutes.put("/:id", verifyJWT, CategoryValidator.update, CategoryController.Update);


export default CategoryRoutes;
