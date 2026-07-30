export interface Template {
  _id: string;
  name: string;
  originalFilename: string;
  fileUrl: string;
  placeholders: string[];
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}
