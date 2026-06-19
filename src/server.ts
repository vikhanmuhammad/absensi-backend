import 'dotenv/config';
import { createApp } from './app';
import { startContractExpiryScheduler } from './services/schedulerService';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function main() {
  const app = await createApp();

  // Start scheduler for auto-deactivating expired contracts & finishing assignments
  startContractExpiryScheduler();

  app.listen(PORT, () => {
    console.log(`Absensi backend berjalan di http://localhost:${PORT}`);
  });
}

main();
