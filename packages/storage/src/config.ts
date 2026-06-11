export type StorageConfig = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

export function getStorageConfig(): StorageConfig {
  const endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
  const url = new URL(endpoint);
  const defaultPort = url.protocol === "https:" ? 443 : 80;

  return {
    endPoint: url.hostname,
    port: url.port ? Number(url.port) : defaultPort,
    useSSL: url.protocol === "https:",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "aeronexis-docs"
  };
}
