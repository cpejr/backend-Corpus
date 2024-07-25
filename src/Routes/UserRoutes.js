import UserValidator from "../Validators/UserValidator.js";
import UserController from "../Controllers/UserController.js";
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";
import verifyUser from "../Middlewares/VerifyUser.js";

const UserRoutes = express.Router();

UserRoutes.post("/", verifyJWT, UserValidator.create, UserController.Create);
UserRoutes.get("/", verifyJWT, UserController.Read);
UserRoutes.delete("/:id", verifyJWT, verifyUser, UserValidator.destroy, UserController.Destroy);
UserRoutes.put("/:id", verifyJWT, verifyUser, UserValidator.update, UserController.Update);

export default UserRoutes;

