import SessionValidator from "../Validators/SessionValidator.js";
import SessionController from "../Controllers/SessionController.js";
import express from "express";

const SessionRoutes = express.Router();

SessionRoutes.post("/login", SessionValidator.login, SessionController.Login);
SessionRoutes.post("/logout", SessionValidator.logout, SessionController.Logout);
SessionRoutes.get("/refresh", SessionValidator.refresh, SessionController.RefreshToken);

export default SessionRoutes;