import { Schema, model, Document, Types } from 'mongoose';

export const REPORT_FORMATS = ['vtu_eligibility', 'hod_bonafide', 'tournament_bonafide', 'custom'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface IReport extends Document {
  _id: Types.ObjectId;
  format: ReportFormat;
  scope: 'single' | 'multiple' | 'all';
  studentIds: Types.ObjectId[];
  studentCount: number;
  fileUrl?: string;
  filePublicId?: string;
  fileName: string;
  templateId?: Types.ObjectId;
  generatedContent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    format: { type: String, enum: REPORT_FORMATS, required: true },
    scope: { type: String, enum: ['single', 'multiple', 'all'], required: true },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    studentCount: { type: Number, required: true, default: 0 },
    fileUrl: { type: String },
    filePublicId: { type: String },
    fileName: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    generatedContent: { type: String },
  },
  { timestamps: true }
);

reportSchema.index({ createdAt: -1 });

export const Report = model<IReport>('Report', reportSchema);
