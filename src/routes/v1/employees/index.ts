import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../../../utils/db';
import { apiOk, apiError, handleError } from '../../../tools/common';
import { requireAuth } from '../../../middlewares/auth.middleware';
import { requireRole } from '../../../middlewares/role.middleware';

const listQuerySchema = z.object({
  search: z.string().optional(),
  divisiId: z.string().optional(),
  statusKaryawan: z.enum(['TETAP', 'KONTRAK', 'HARIAN']).optional(),
});

export const get = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD', 'SUPERVISOR']),
  async (req: Request, res: Response) => {
    try {
      const filter = listQuerySchema.parse(req.query);

      // Supervisor hanya bisa lihat karyawan divisi sendiri
      const where: Record<string, unknown> = {
        statusKaryawan: filter.statusKaryawan,
        namaLengkap: filter.search ? { contains: filter.search } : undefined,
      };

      if (req.user!.role === 'SUPERVISOR' && req.user!.employeeId) {
        // Supervisor hanya lihat divisi sendiri — abaikan filter divisiId dari query
        const supervisor = await db.employee.findUnique({
          where: { id: req.user!.employeeId },
          select: { divisiId: true },
        });
        if (supervisor) {
          where.divisiId = supervisor.divisiId;
        }
      } else {
        where.divisiId = filter.divisiId;
      }

      const employees = await db.employee.findMany({
        where,
        include: { divisi: true },
        orderBy: { namaLengkap: 'asc' },
      });

      return apiOk(res, employees, 'Daftar karyawan berhasil diambil');
    } catch (error) {
      return handleError(res, error);
    }
  },
];

const createSchema = z.object({
  username: z.string().min(3, 'Username min. 3 karakter'),
  password: z.string().min(6, 'Password min. 6 karakter'),
  nik: z.string().min(1, 'NIK wajib diisi'),
  namaLengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
  email: z.string().email('Email tidak valid'),
  noHp: z.string().min(1, 'No. HP wajib diisi'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  tanggalLahir: z.string().min(1, 'Tanggal lahir wajib diisi'),
  jenisKelamin: z.enum(['L', 'P']),
  statusPernikahan: z.string().min(1),
  jabatan: z.string().min(1, 'Jabatan wajib diisi'),
  divisiId: z.string().min(1, 'Divisi wajib dipilih'),
  statusKaryawan: z.enum(['TETAP', 'KONTRAK', 'HARIAN']),
  tanggalMulaiKerja: z.string().min(1, 'Tanggal mulai kerja wajib diisi'),
  tanggalAkhirKontrak: z.string().optional().nullable(),
  nominalUpah: z.number().min(0, 'Nominal upah tidak boleh negatif'),
  satuanUpah: z.enum(['PER_BULAN', 'PER_JAM']),
  nominalUpahLembur: z.number().min(0, 'Nominal upah lembur tidak boleh negatif'),
  pengaliLembur: z.number().optional().nullable(),
});

export const post = [
  requireAuth,
  requireRole(['SUPER_ADMIN', 'HRD']),
  async (req: Request, res: Response) => {
    try {
      const data = createSchema.parse(req.body);

      // Cek duplikasi username & NIK
      const existingUser = await db.user.findUnique({ where: { username: data.username } });
      if (existingUser) return apiError(res, 'Username sudah digunakan', 409);

      const existingNik = await db.employee.findUnique({ where: { nik: data.nik } });
      if (existingNik) return apiError(res, 'NIK sudah terdaftar', 409);

      const passwordHash = await bcrypt.hash(data.password, 10);

      const result = await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: data.username,
            passwordHash,
            role: 'KARYAWAN',
            statusAktif: true,
          },
        });

        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            nik: data.nik,
            namaLengkap: data.namaLengkap,
            email: data.email,
            noHp: data.noHp,
            alamat: data.alamat,
            tanggalLahir: new Date(data.tanggalLahir),
            jenisKelamin: data.jenisKelamin,
            statusPernikahan: data.statusPernikahan,
            jabatan: data.jabatan,
            divisiId: data.divisiId,
            statusKaryawan: data.statusKaryawan,
            tanggalMulaiKerja: new Date(data.tanggalMulaiKerja),
            tanggalAkhirKontrak: data.tanggalAkhirKontrak ? new Date(data.tanggalAkhirKontrak) : null,
            nominalUpah: data.nominalUpah,
            satuanUpah: data.satuanUpah,
            nominalUpahLembur: data.nominalUpahLembur,
            pengaliLembur: data.pengaliLembur ?? null,
            statusAktif: true,
          },
          include: { divisi: true },
        });

        return { user, employee };
      });

      return apiOk(res, result.employee, 'Karyawan baru berhasil dibuat', 201);
    } catch (error) {
      return handleError(res, error);
    }
  },
];
