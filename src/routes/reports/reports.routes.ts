import { Router } from 'express';
import * as reportsController from './reports.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.get('/dashboard-summary', requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']), reportsController.getDashboardSummary);
router.get('/attendance', requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']), reportsController.getAttendanceReport);

export default router;
