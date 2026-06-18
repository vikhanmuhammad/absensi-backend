import { Request, Response } from 'express';
import { apiOk } from '../../../tools/common';

export const post = (_req: Request, res: Response) => {
  res.clearCookie('token');
  return apiOk(res, null, 'Logout berhasil');
};
