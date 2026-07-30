export const GENDERS = ['Male', 'Female', 'Other'] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export interface Student {
  _id: string;
  name: string;
  usn: string;
  dob?: string;
  gender?: Gender;
  semester?: string;
  branch?: string;
  phone: string;
  email?: string;
  motherName?: string;
  fatherName?: string;
  sport?: string;
  bloodGroup?: BloodGroup;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFormValues {
  name: string;
  usn: string;
  phone: string;
  dob?: string;
  gender?: Gender | '';
  semester?: string;
  branch?: string;
  email?: string;
  motherName?: string;
  fatherName?: string;
  sport?: string;
  bloodGroup?: BloodGroup | '';
  photo?: File | null;
}

export interface StudentListParams {
  search?: string;
  branch?: string;
  sport?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  semester?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'usn' | 'branch' | 'sport' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ImportResult {
  imported: number;
  skipped: { row: number; reason: string }[];
}
