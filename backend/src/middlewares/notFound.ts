import { Request, Response, NextFunction } from 'express';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `API Not Found: ${req.originalUrl}`,
    errors: [
      {
        path: req.originalUrl,
        message: 'The requested route does not exist.',
      },
    ],
  });
};
