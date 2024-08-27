import UserValidator from "../Validators/UserValidator.js";
import UserController from "../Controllers/UserController.js";
import express from "express";
import verifyJWT from "../Middlewares/VerifyJwt.js";

const UserRoutes = express.Router();

UserRoutes.post("/", UserValidator.create, UserController.Create);
UserRoutes.get("/", verifyJWT, UserController.Read);
UserRoutes.delete("/:id", verifyJWT, UserValidator.destroy, UserController.Destroy);
UserRoutes.put("/:id", verifyJWT, UserValidator.update, UserController.Update);

UserRoutes.post("/forgot-password", UserValidator.forgotPassword, UserController.ForgotPassword);
UserRoutes.put("/forgot-password/:token", UserValidator.redefinePassword, UserController.RedifinePassword);


export default UserRoutes;
