import { Router } from 'express';
import * as authController from './auth.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
