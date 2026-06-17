import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`Absensi backend berjalan di http://localhost:${PORT}`);
});
