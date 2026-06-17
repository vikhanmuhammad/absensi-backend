import { Request, Response, NextFunction } from 'express';
import * as projectsService from './projects.service';
import { createProjectSchema } from './projects.schema';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await projectsService.list();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await projectsService.getById(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProjectSchema.parse(req.body);
    const result = await projectsService.create(req.user!.userId, input);
    res.status(201).json({ success: true, data: result, message: 'Projek berhasil dibuat' });
  } catch (err) {
    next(err);
  }
}
