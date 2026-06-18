import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import createRouter from 'express-file-routing';
import { errorHandler } from './middlewares/error.middleware';

export async function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'absensi backend is running' });
  });

  // File-based routing: setiap file di bawah src/routes/v1/** otomatis menjadi endpoint
  // (index.ts -> path induk, [id].ts -> :id, nama-file.ts -> /nama-file). Lihat README express-file-routing.
  const apiRouter = express.Router();
  await createRouter(apiRouter, { directory: path.join(__dirname, 'routes') });
  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
}
