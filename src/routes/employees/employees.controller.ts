import { Request, Response, NextFunction } from 'express';
import * as employeesService from './employees.service';
import { listEmployeesQuerySchema, updateEmployeeSchema } from './employees.schema';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listEmployeesQuerySchema.parse(req.query);
    const result = await employeesService.list(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await employeesService.getById(req.params.id as string);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateEmployeeSchema.parse(req.body);
    const result = await employeesService.update(req.params.id as string, input);
    res.json({ success: true, data: result, message: 'Data karyawan berhasil diperbarui' });
  } catch (err) {
    next(err);
  }
}
