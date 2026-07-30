import { Schema, model, Document, Types } from 'mongoose';

export const GENDERS = ['Male', 'Female', 'Other'] as const;
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export interface IStudent extends Document {
  _id: Types.ObjectId;
  name: string;
  usn: string;
  dob?: string;
  gender?: (typeof GENDERS)[number];
  semester?: string;
  branch?: string;
  phone: string;
  email?: string;
  motherName?: string;
  fatherName?: string;
  sport?: string;
  bloodGroup?: (typeof BLOOD_GROUPS)[number];
  photoUrl?: string;
  photoPublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    usn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 10,
      maxlength: 10,
    },
    dob: { type: String, trim: true },
    gender: { type: String, enum: GENDERS },
    semester: { type: String, trim: true, maxlength: 20 },
    branch: { type: String, trim: true, maxlength: 100 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{10}$/,
    },
    email: { type: String, trim: true, lowercase: true, maxlength: 150 },
    motherName: { type: String, trim: true, maxlength: 120 },
    fatherName: { type: String, trim: true, maxlength: 120 },
    sport: { type: String, trim: true, maxlength: 100 },
    bloodGroup: { type: String, enum: BLOOD_GROUPS },
    photoUrl: { type: String },
    photoPublicId: { type: String },
  },
  { timestamps: true }
);

studentSchema.index({ name: 'text', usn: 'text', branch: 'text', sport: 'text' });
studentSchema.index({ branch: 1 });
studentSchema.index({ sport: 1 });
studentSchema.index({ createdAt: -1 });

export const Student = model<IStudent>('Student', studentSchema);
