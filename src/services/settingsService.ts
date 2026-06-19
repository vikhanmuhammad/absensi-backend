import { db } from '../utils/db';

const SETTINGS_ID = 1;

const DEFAULTS = {
  jamMasukStandar: '08:00',
  jamPulangStandar: '17:00',
  batasTerlambat: '08:00',
  batasAlfa: '12:00',
};

export async function getSystemSettings() {
  const existing = await db.systemSetting.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return db.systemSetting.create({ data: { id: SETTINGS_ID, ...DEFAULTS } });
}

export async function updateSystemSettings(data: Partial<typeof DEFAULTS>) {
  return db.systemSetting.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...DEFAULTS, ...data },
  });
}

/** Konversi "HH:mm" menjadi jam desimal, misal "08:30" -> 8.5. */
export function timeToDecimal(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + (m || 0) / 60;
}
