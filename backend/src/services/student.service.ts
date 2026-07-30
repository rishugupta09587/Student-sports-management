import { FilterQuery } from 'mongoose';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { IStudent, Student } from '../models/Student.model';
import { CreateStudentInput, ListStudentsQuery, UpdateStudentInput } from '../validators/student.validator';
import { ApiError } from '../utils/ApiError';
import { deleteAsset, uploadBuffer } from './cloudinaryUpload.service';

export async function listStudents(query: ListStudentsQuery) {
  const { search, branch, sport, gender, bloodGroup, semester, page, limit, sortBy, sortOrder } = query;

  const filter: FilterQuery<IStudent> = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (branch) filter.branch = branch;
  if (sport) filter.sport = sport;
  if (gender) filter.gender = gender;
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (semester) filter.semester = semester;

  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [students, total] = await Promise.all([
    Student.find(filter).sort(sort).skip(skip).limit(limit),
    Student.countDocuments(filter),
  ]);

  return {
    students,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getStudentById(id: string): Promise<IStudent> {
  const student = await Student.findById(id);
  if (!student) throw ApiError.notFound('Student not found');
  return student;
}

export async function createStudent(input: CreateStudentInput, photo?: Express.Multer.File): Promise<IStudent> {
  const existing = await Student.findOne({ usn: input.usn });
  if (existing) throw ApiError.conflict('USN already exists');

  let photoUrl: string | undefined;
  let photoPublicId: string | undefined;
  if (photo) {
    const uploaded = await uploadBuffer(photo.buffer, 'students');
    photoUrl = uploaded.url;
    photoPublicId = uploaded.publicId;
  }

  return Student.create({ ...input, photoUrl, photoPublicId });
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
  photo?: Express.Multer.File
): Promise<IStudent> {
  const student = await Student.findById(id);
  if (!student) throw ApiError.notFound('Student not found');

  if (input.usn !== student.usn) {
    const clash = await Student.findOne({ usn: input.usn, _id: { $ne: id } });
    if (clash) throw ApiError.conflict('USN already exists');
  }

  if (photo) {
    if (student.photoPublicId) {
      await deleteAsset(student.photoPublicId).catch(() => undefined);
    }
    const uploaded = await uploadBuffer(photo.buffer, 'students');
    student.photoUrl = uploaded.url;
    student.photoPublicId = uploaded.publicId;
  }

  Object.assign(student, input);
  await student.save();
  return student;
}

export async function deleteStudent(id: string): Promise<void> {
  const student = await Student.findById(id);
  if (!student) throw ApiError.notFound('Student not found');

  if (student.photoPublicId) {
    await deleteAsset(student.photoPublicId).catch(() => undefined);
  }
  await student.deleteOne();
}

const CSV_COLUMNS = [
  'name',
  'usn',
  'dob',
  'gender',
  'semester',
  'branch',
  'phone',
  'email',
  'motherName',
  'fatherName',
  'sport',
  'bloodGroup',
] as const;

export async function exportStudentsCsv(): Promise<string> {
  const students = await Student.find().sort({ name: 1 }).lean();
  const rows = students.map((s) => {
    const row: Record<string, string> = {};
    for (const col of CSV_COLUMNS) {
      row[col] = (s as unknown as Record<string, string | undefined>)[col] ?? '';
    }
    return row;
  });
  return stringify(rows, { header: true, columns: CSV_COLUMNS as unknown as string[] });
}

interface ImportResult {
  imported: number;
  skipped: { row: number; reason: string }[];
}

export async function importStudentsCsv(buffer: Buffer): Promise<ImportResult> {
  const records: Record<string, string>[] = parse(buffer, {
    columns: true,
    trim: true,
    skip_empty_lines: true,
  });

  const result: ImportResult = { imported: 0, skipped: [] };

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const rowNumber = i + 2; // account for header row

    try {
      if (!record.name || !record.usn || !record.phone) {
        result.skipped.push({ row: rowNumber, reason: 'Missing required field (name, usn, or phone)' });
        continue;
      }
      if (record.usn.length !== 10) {
        result.skipped.push({ row: rowNumber, reason: 'USN must be exactly 10 characters' });
        continue;
      }
      if (!/^\d{10}$/.test(record.phone)) {
        result.skipped.push({ row: rowNumber, reason: 'Phone must be exactly 10 digits' });
        continue;
      }

      const usn = record.usn.toUpperCase();
      const existing = await Student.findOne({ usn });
      if (existing) {
        result.skipped.push({ row: rowNumber, reason: `USN ${usn} already exists` });
        continue;
      }

      await Student.create({
        name: record.name,
        usn,
        phone: record.phone,
        dob: record.dob || undefined,
        gender: (record.gender as IStudent['gender']) || undefined,
        semester: record.semester || undefined,
        branch: record.branch || undefined,
        email: record.email || undefined,
        motherName: record.motherName || undefined,
        fatherName: record.fatherName || undefined,
        sport: record.sport || undefined,
        bloodGroup: (record.bloodGroup as IStudent['bloodGroup']) || undefined,
      });
      result.imported += 1;
    } catch (err) {
      result.skipped.push({ row: rowNumber, reason: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return result;
}
