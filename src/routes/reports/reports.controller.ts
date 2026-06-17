import { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import { attendanceReportQuerySchema } from './reports.schema';

export async function getDashboardSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.getDashboardSummary();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceReport(req: Request, res: Response, next: NextFunction) {
  try {
    const query = attendanceReportQuerySchema.parse(req.query);
    const result = await reportsService.getAttendanceReport(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
