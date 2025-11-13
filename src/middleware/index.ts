import express, { Express, Request, Response, NextFunction } from "express";

export function setupMiddleware(app: Express): void {
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-Frame-Options", "DENY");
    res.header("X-XSS-Protection", "1; mode=block");
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`
      );
    });

    next();
  });
}
