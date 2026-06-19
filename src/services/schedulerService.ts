import { db } from '../utils/db';

/**
 * Auto-deactivate employees whose contract has ended.
 * Runs every hour via setInterval. Called once on server start.
 */
export function startContractExpiryScheduler() {
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 jam

  async function check() {
    try {
      const now = new Date();

      // Nonaktifkan karyawan kontrak yang sudah berakhir
      const result = await db.employee.updateMany({
        where: {
          statusKaryawan: 'KONTRAK',
          statusAktif: true,
          tanggalAkhirKontrak: { lt: now },
        },
        data: { statusAktif: false },
      });

      if (result.count > 0) {
        console.log(`[Scheduler] ${result.count} karyawan kontrak otomatis dinonaktifkan (kontrak berakhir)`);

        // Nonaktifkan juga user terkait
        const expiredEmployees = await db.employee.findMany({
          where: {
            statusKaryawan: 'KONTRAK',
            statusAktif: false,
            tanggalAkhirKontrak: { lt: now },
          },
          select: { userId: true },
        });

        const userIds = expiredEmployees.map((e) => e.userId);
        if (userIds.length > 0) {
          await db.user.updateMany({
            where: { id: { in: userIds }, statusAktif: true },
            data: { statusAktif: false },
          });
        }
      }

      // Selesaikan project assignment yang sudah berakhir
      const endedAssignments = await db.projectAssignment.updateMany({
        where: {
          status: 'AKTIF',
          tanggalBerakhir: { lt: now },
        },
        data: { status: 'SELESAI' },
      });

      if (endedAssignments.count > 0) {
        console.log(`[Scheduler] ${endedAssignments.count} penugasan projek otomatis diselesaikan`);
      }
    } catch (err) {
      console.error('[Scheduler] Error saat pengecekan kontrak/penugasan:', err);
    }
  }

  // Jalankan sekali saat startup, lalu setiap jam
  check();
  setInterval(check, CHECK_INTERVAL_MS);

  console.log('[Scheduler] Penjadwal auto-deactivate kontrak & selesai penugasan aktif');
}
