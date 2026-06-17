import { Router } from 'express';
import * as attendanceController from './attendance.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);
router.get('/today', attendanceController.getToday);
router.get('/', attendanceController.getHistory);
router.post('/bulk', requireRole(['SUPERVISOR', 'SUPER_ADMIN', 'HRD']), attendanceController.bulkInput);

export default router;
