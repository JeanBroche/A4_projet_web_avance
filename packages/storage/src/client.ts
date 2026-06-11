import * as Minio from "minio";
import { getStorageConfig } from "./config.js";

let client: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (client) {
    return client;
  }

  const config = getStorageConfig();
  client = new Minio.Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey
  });
  return client;
}

export function resetMinioClient() {
  client = null;
}
