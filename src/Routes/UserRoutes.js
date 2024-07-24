import UserValidator from "../Validators/UserValidator.js";
import UserController from "../Controllers/UserController.js";
import express from "express";

const UserRoutes = express.Router();

UserRoutes.post("/user", UserValidator.create, UserController.Create);
UserRoutes.get("/user", UserController.Read);
UserRoutes.delete("/user/:id", UserValidator.destroy, UserController.Destroy);
UserRoutes.put("/user/:id", UserValidator.update, UserController.Update);

export default UserRoutes;

