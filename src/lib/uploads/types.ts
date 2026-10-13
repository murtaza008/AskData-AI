/** Types shared by the CSV upload UI and API. Isomorphic. */

export const UPLOAD_COLUMN_TYPES = ["text", "number", "date", "boolean"] as const;
export type UploadColumnType = (typeof UPLOAD_COLUMN_TYPES)[number];

export type UploadColumn = {
  /** Sanitised SQL column name. */
  name: string;
  /** Header exactly as it appeared in the file. */
  originalName: string;
  type: UploadColumnType;
};

export type UploadDTO = {
  id: string;
  /** Fully-qualified name to use in questions/SQL, e.g. `uploads.u_3fa9c2d1_sales`. */
  tableName: string;
  originalName: string;
  columns: UploadColumn[];
  rowCount: number;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
};

export type UploadLimits = {
  maxBytes: number;
  maxRows: number;
  maxColumns: number;
  maxTables: number;
  ttlDays: number;
};

export type UploadsResponse = {
  uploads: UploadDTO[];
  limits: UploadLimits;
};
