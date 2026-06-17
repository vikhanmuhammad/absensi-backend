import { Request, Response, NextFunction } from 'express';
import * as divisionsService from './divisions.service';
import { createDivisionSchema, updateDivisionSchema } from './divisions.schema';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await divisionsService.list();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await divisionsService.getById(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDivisionSchema.parse(req.body);
    const result = await divisionsService.create(input);
    res.status(201).json({ success: true, data: result, message: 'Divisi berhasil dibuat' });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateDivisionSchema.parse(req.body);
    const result = await divisionsService.update(req.params.id as string, input);
    res.json({ success: true, data: result, message: 'Divisi berhasil diperbarui' });
  } catch (err) {
    next(err);
  }
}
