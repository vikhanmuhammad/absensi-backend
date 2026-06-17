import { Router } from 'express';
import * as overtimeRequestsController from './overtime-requests.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.use(requireAuth);

router.get('/me', overtimeRequestsController.listMine);
router.post('/', overtimeRequestsController.create);
router.post('/bulk', requireRole(['SUPERVISOR', 'SUPER_ADMIN', 'HRD']), overtimeRequestsController.createBulk);

export default router;
