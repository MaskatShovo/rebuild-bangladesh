import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
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
export async function putImage(
  ownerId: string,
  bytes: Buffer,
  alt: string,
  listingId?: string,
) {
  assert(bytes.length > 0 && bytes.length <= 8 * 1024 * 1024, "UPLOAD", 413);
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
  await storage.send(
    new PutObjectCommand({
      Bucket,
      Key: objectKey,
      Body: full,
      ContentType: "image/webp",
    }),
  );
  await storage.send(
    new PutObjectCommand({
      Bucket,
      Key: thumbnailKey,
      Body: thumb,
      ContentType: "image/webp",
    }),
  );
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
    await storage.send(new DeleteObjectCommand({ Bucket, Key: u.objectKey }));
    await storage.send(
      new DeleteObjectCommand({ Bucket, Key: u.thumbnailKey }),
    );
    await db.upload.delete({ where: { id: u.id } });
  }
}
