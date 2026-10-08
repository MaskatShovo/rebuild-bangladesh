import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { put, get, del } from "@vercel/blob";
import { db } from "./db";
import { assert } from "./errors";
export const storage = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});
const Bucket = process.env.S3_BUCKET || "rebuild";
const usesBlobStorage = () => process.env.STORAGE_DRIVER === "vercel-blob";
async function writeObject(key: string, body: Buffer) {
  if (usesBlobStorage()) {
    await put(key, body, {
      access: "private",
      addRandomSuffix: false,
      contentType: "image/webp",
    });
  } else {
    await storage.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        Body: body,
        ContentType: "image/webp",
      }),
    );
  }
}
async function removeObject(key: string) {
  if (usesBlobStorage()) await del(key);
  else await storage.send(new DeleteObjectCommand({ Bucket, Key: key }));
}
export async function putImage(
  ownerId: string,
  bytes: Buffer,
  alt: string,
  listingId?: string,
) {
  assert(bytes.length > 0 && bytes.length <= 4 * 1024 * 1024, "UPLOAD", 413);
  const image = sharp(bytes, { limitInputPixels: 30_000_000, animated: false });
  let meta;
  try {
    meta = await image.metadata();
  } catch {
    assert(false, "UPLOAD");
  }
  assert(
    meta && ["jpeg", "png", "webp"].includes(meta.format ?? "") && !meta.pages,
    "UPLOAD",
  );
  const objectKey = `images/${crypto.randomUUID()}.webp`,
    thumbnailKey = objectKey.replace(".webp", "-thumb.webp");
  const full = await image
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const thumb = await sharp(full)
    .resize(640, 480, { fit: "cover" })
    .webp({ quality: 78 })
    .toBuffer();
  await writeObject(objectKey, full);
  await writeObject(thumbnailKey, thumb);
  return db.upload.create({
    data: {
      ownerId,
      objectKey,
      thumbnailKey,
      alt: alt.slice(0, 160),
      listingId,
    },
  });
}
export async function imageBytes(key: string) {
  if (usesBlobStorage()) {
    const object = await get(key, { access: "private" });
    assert(object && object.statusCode === 200, "NOT_FOUND", 404);
    return new Uint8Array(await new Response(object.stream).arrayBuffer());
  }
  const object = await storage.send(new GetObjectCommand({ Bucket, Key: key }));
  return object.Body!.transformToByteArray();
}
export async function cleanupUploads() {
  const uploads = await db.upload.findMany({
    where: {
      listingId: null,
      createdAt: { lt: new Date(Date.now() - 86400000) },
    },
    take: 100,
  });
  for (const u of uploads) {
    await removeObject(u.objectKey);
    await removeObject(u.thumbnailKey);
    await db.upload.delete({ where: { id: u.id } });
  }
}
