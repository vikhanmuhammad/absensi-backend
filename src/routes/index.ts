import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import employeesRoutes from './employees/employees.routes';
import divisionsRoutes from './divisions/divisions.routes';
import attendanceRoutes from './attendance/attendance.routes';
import leaveRequestsRoutes from './leave-requests/leave-requests.routes';
import overtimeRequestsRoutes from './overtime-requests/overtime-requests.routes';
import projectsRoutes from './projects/projects.routes';
import manpowerRequestsRoutes from './manpower-requests/manpower-requests.routes';
import reportsRoutes from './reports/reports.routes';
import notificationsRoutes from './notifications/notifications.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeesRoutes);
router.use('/divisions', divisionsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave-requests', leaveRequestsRoutes);
router.use('/overtime-requests', overtimeRequestsRoutes);
router.use('/projects', projectsRoutes);
router.use('/manpower-requests', manpowerRequestsRoutes);
router.use('/reports', reportsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;
