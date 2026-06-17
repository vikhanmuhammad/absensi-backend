import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Anda tidak memiliki akses untuk aksi ini' });
      return;
    }
    next();
  };
}

/**
 * Akun Super Admin bertipe IT/Maintenance memiliki akses teknis penuh tapi
 * dikecualikan dari wewenang approve/reject (lihat docs/FSD.md bagian 5.4).
 * Pasang middleware ini di SEMUA endpoint approve/reject.
 */
export function blockItMaintenanceApproval(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'SUPER_ADMIN' && req.user.superAdminType === 'IT_MAINTENANCE') {
    res.status(403).json({
      success: false,
      message: 'Akun Super Admin (IT/Maintenance) tidak memiliki wewenang approval',
    });
    return;
  }
  next();
}
