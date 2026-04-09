import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validate-request.middleware";
import { createUserSchema, loginSchema } from "../schemas/auth.schema";

const authRoutes = Router();

authRoutes.post("/register", validateRequest(createUserSchema),(req, res, next) => authController.register(req, res, next));
authRoutes.post("/login", validateRequest(loginSchema),(req, res, next) => authController.login(req, res, next));

export default authRoutes;