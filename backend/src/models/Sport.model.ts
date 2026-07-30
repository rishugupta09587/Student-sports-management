import { Schema, model, Document, Types } from 'mongoose';

export interface ISport extends Document {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sportSchema = new Schema<ISport>(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    category: { type: String, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Sport = model<ISport>('Sport', sportSchema);
