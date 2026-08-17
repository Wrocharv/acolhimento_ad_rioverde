import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Envolve um handler assíncrono para que erros não tratados virem uma resposta 500 em vez de derrubar o processo. */
export function asyncHandler(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      console.error(`[${req.method} ${req.path}] Erro não tratado`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "internal_error" });
      }
      next(error);
    });
  };
}
