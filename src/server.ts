import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

async function main() {
  const app = await createApp();
  app.listen(PORT, () => {
    console.log(`Absensi backend berjalan di http://localhost:${PORT}`);
  });
}

main();
