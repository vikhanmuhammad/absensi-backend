import { Router } from 'express';
import * as leaveRequestsController from './leave-requests.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole, blockItMaintenanceApproval } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.get('/me', leaveRequestsController.listMine);
router.get('/pending', requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']), leaveRequestsController.listPending);
router.post('/', leaveRequestsController.create);
router.patch(
  '/:id/approve',
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  blockItMaintenanceApproval,
  leaveRequestsController.approve,
);
router.patch(
  '/:id/reject',
  requireRole(['SUPERVISOR', 'HRD', 'SUPER_ADMIN']),
  blockItMaintenanceApproval,
  leaveRequestsController.reject,
);

export default router;
