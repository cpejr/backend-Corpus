import CategoryValidator from "../Validators/CategoryValidator.js";
import CategoryController from "../Controllers/CategoryController.js";
import express from "express";

const CategoryRoutes  = express.Router();

CategoryRoutes.post("/category", CategoryValidator.create, CategoryController.Create);

CategoryRoutes.get("/category", CategoryController.Read);

CategoryRoutes.delete("/category/:id", CategoryValidator.destroy, CategoryController.Delete);

CategoryRoutes.put("/category/:id", CategoryValidator.update, CategoryController.Update);


export default CategoryRoutes;
