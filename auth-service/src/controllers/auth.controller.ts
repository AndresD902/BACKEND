import { Request, Response, NextFunction } from "express";
import { authService, AuthService } from "../services/auth.service";



export class AuthController {
       public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try{
            const user = await authService.register(req.body);
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: user,
            });
        } catch (error) {
            next(error);
        }
    }
        public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
            try {
                const result = await authService.login(req.body);
                res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    data: result,
                });
            } catch (error) {
                next(error);
            }
        }
}

export const authController = new AuthController();