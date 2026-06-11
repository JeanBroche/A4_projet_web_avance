export class DocumentValidationError extends Error {
  readonly code = "VALIDATION_ERROR" as const;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DocumentValidationError";
  }
}

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function validateDocumentFile(mimeType: string, sizeBytes: number) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    throw new DocumentValidationError("MIME type is not allowed", {
      mimeType,
      allowed: [...ALLOWED_MIME_TYPES]
    });
  }

  if (sizeBytes <= 0) {
    throw new DocumentValidationError("File is empty");
  }

  if (sizeBytes > MAX_DOCUMENT_SIZE_BYTES) {
    throw new DocumentValidationError("File exceeds maximum size of 10 MB", {
      sizeBytes,
      maxBytes: MAX_DOCUMENT_SIZE_BYTES
    });
  }
}
