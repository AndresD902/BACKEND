import { Router, Request, Response } from "express";
import { deflate } from "node:zlib";
import { success } from "zod";

const router  = Router();

router.get('/health',(_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message : 'Auth service is running',
    });
});

export default router