import { Schema, model, Document, Types } from 'mongoose';

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  originalFilename: string;
  fileUrl: string;
  filePublicId?: string;
  placeholders: string[];
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    originalFilename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    filePublicId: { type: String },
    placeholders: { type: [String], default: [] },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Template = model<ITemplate>('Template', templateSchema);
