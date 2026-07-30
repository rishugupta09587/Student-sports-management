import { Schema, model, Document } from 'mongoose';

export interface IApplicationSettings extends Document {
  key: string;
  collegeName: string;
  collegeAddress: string;
  academicYear: string;
  defaultReportFormat: string;
  updatedAt: Date;
}

const applicationSettingsSchema = new Schema<IApplicationSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    collegeName: {
      type: String,
      default: 'DAYANANDA SAGAR ACADEMY OF TECHNOLOGY AND MANAGEMENT, BANGALURU 560082',
    },
    collegeAddress: { type: String, default: '' },
    academicYear: { type: String, default: '2025-26' },
    defaultReportFormat: { type: String, default: 'vtu_eligibility' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const ApplicationSettings = model<IApplicationSettings>('ApplicationSettings', applicationSettingsSchema);
