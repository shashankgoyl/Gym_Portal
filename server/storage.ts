// Local file storage for uploaded health-report PDFs.
// HP is a private, single-owner app with no cloud storage account, so
// uploads are written straight to a folder on disk and served back through
// the "/uploads" static route registered in server/_core/index.ts.

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

function uploadsRoot(): string {
  const dir = path.resolve(process.cwd(), ENV.uploadsDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = path.join(uploadsRoot(), key);

  // Guard against path traversal from a crafted key.
  if (!filePath.startsWith(uploadsRoot())) {
    throw new Error("Invalid storage key");
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);

  return { key, url: `/uploads/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}
