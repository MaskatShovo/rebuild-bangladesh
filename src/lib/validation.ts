import { z } from "zod";
const optionalText = z
  .string()
  .trim()
  .max(120)
  .nullish()
  .transform((v) => v || null);
const dimension = z.coerce
  .number()
  .int()
  .positive()
  .max(100000)
  .nullable()
  .optional();
export const listingSchema = z
  .object({
    title: z.string().trim().min(8).max(140),
    description: z.string().trim().min(20).max(4000),
    categoryId: z.enum([
      "tiles",
      "sanitary",
      "doors",
      "lighting",
      "flooring",
      "fixtures",
    ]),
    condition: z.enum(["UNOPENED", "UNUSED", "USED_GOOD"]),
    price: z.coerce.number().int().min(100).max(100000000),
    unit: z.enum(["box", "piece", "set", "pack"]),
    total: z.coerce.number().int().min(1).max(100000),
    minimum: z.coerce.number().int().min(1).max(100000),
    increment: z.coerce.number().int().min(1).max(100000),
    partial: z.boolean(),
    area: z.string().trim().min(2).max(80),
    district: z.string().trim().min(2).max(80).default("Dhaka"),
    pickupNotes: z.string().trim().min(5).max(1000),
    privatePickup: z.string().trim().min(5).max(1000),
    disclosures: z.string().trim().min(5).max(1000),
    brand: optionalText,
    modelCode: optionalText,
    batchCode: optionalText,
    finish: optionalText,
    colour: optionalText,
    material: optionalText,
    widthMm: dimension,
    lengthMm: dimension,
    thicknessMm: dimension,
    weightGrams: dimension,
    piecesPerBox: z.coerce
      .number()
      .int()
      .positive()
      .max(1000)
      .nullable()
      .optional(),
    imageIds: z.array(z.string()).max(8).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.price * v.total > 2_000_000_000)
      ctx.addIssue({
        code: "custom",
        path: ["price"],
        message: "INVALID_INPUT",
      });
    if (v.minimum > v.total || v.total % v.increment || v.minimum % v.increment)
      ctx.addIssue({
        code: "custom",
        path: ["minimum"],
        message: "INVALID_INPUT",
      });
    if (
      ["tiles", "doors", "flooring"].includes(v.categoryId) &&
      (!v.widthMm || !v.lengthMm)
    )
      ctx.addIssue({
        code: "custom",
        path: ["widthMm"],
        message: "INVALID_INPUT",
      });
    if (v.categoryId === "tiles" && v.unit === "box" && !v.piecesPerBox)
      ctx.addIssue({
        code: "custom",
        path: ["piecesPerBox"],
        message: "INVALID_INPUT",
      });
  });
export const wantedSchema = z.object({
  title: z.string().trim().min(8).max(140),
  description: z.string().trim().min(10).max(2000),
  categoryId: z.enum([
    "tiles",
    "sanitary",
    "doors",
    "lighting",
    "flooring",
    "fixtures",
  ]),
  area: z.string().trim().min(2).max(80),
  quantity: z.coerce.number().int().positive().max(100000),
  unit: z.enum(["box", "piece", "set", "pack"]),
  modelCode: optionalText,
  widthMm: dimension,
  lengthMm: dimension,
  deadline: z.string().datetime().nullable().optional(),
});
export const searchSchema = z.object({
  q: z.string().max(120).default(""),
  category: z.string().max(40).default(""),
  area: z.string().max(80).default(""),
  condition: z.string().max(30).default(""),
  brand: z.string().max(80).default(""),
  model: z.string().max(80).default(""),
  finish: z.string().max(80).default(""),
  partial: z.enum(["", "true"]).default(""),
  min: z.coerce.number().min(0).default(0),
  max: z.coerce.number().min(0).default(1000000),
  quantity: z.coerce.number().int().min(0).default(0),
  width: z.coerce.number().int().min(0).default(0),
  length: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["recent", "price-low", "price-high"]).default("recent"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
export function normalizePhone(value: string) {
  const phone = value
    .replace(/[\s()-]/g, "")
    .replace(/^00880/, "+880")
    .replace(/^01/, "+8801");
  return /^\+8801[3-9]\d{8}$/.test(phone) ? phone : null;
}
export function coverage(
  width: number | null,
  length: number | null,
  pieces: number | null,
  area: number,
  waste: number,
  increment = 1,
) {
  if (
    !width ||
    !length ||
    !pieces ||
    area <= 0 ||
    waste < 0 ||
    waste > 30 ||
    increment < 1
  )
    return null;
  const squareMetresPerBox = (width * length * pieces) / 1_000_000;
  return {
    squareMetresPerBox,
    boxes:
      Math.ceil((area * (1 + waste / 100)) / squareMetresPerBox / increment) *
      increment,
  };
}
