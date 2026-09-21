import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";
import { putImage } from "../src/lib/storage";
import { normalize } from "../src/lib/validation";
import { categories } from "../src/lib/format";
import { requestPurchase, changeOrder } from "../src/lib/orders";
if (process.env.NODE_ENV === "production" || process.env.DEMO_MODE !== "true")
  throw new Error("Seed is development-only; set DEMO_MODE=true");
mkdirSync(".local", { recursive: true });
const accessPath = ".local/demo-access.json";
const access: Record<string, { email: string; password: string }> = existsSync(
  accessPath,
)
  ? JSON.parse(readFileSync(accessPath, "utf8"))
  : {};
for (const [kind, name, role] of [
  ["buyer", "Nadia · Demo", "MEMBER"],
  ["seller", "Arif · Demo", "MEMBER"],
  ["seller2", "Maya · Demo", "MEMBER"],
  ["moderator", "Moderator · Demo", "MODERATOR"],
  ["admin", "Administrator · Demo", "ADMIN"],
]) {
  const id = `demo-${kind}`,
    email = `${kind}@rebuild.local`;
  access[kind] ??= { email, password: randomBytes(18).toString("base64url") };
  const u = await db.user.upsert({
    where: { id },
    create: {
      id,
      email,
      name,
      role,
      emailVerified: true,
      createdAt: new Date("2026-01-15T00:00:00Z"),
      ...(kind.startsWith("seller")
        ? {
            sellerName:
              kind === "seller"
                ? "Arif’s renovation extras · Demo"
                : "Maya’s material shelf · Demo",
            bio: "Fictional local demonstration profile. These materials are not offered for real sale.",
          }
        : {}),
    },
    update: {},
  });
  await db.account.upsert({
    where: { id: `account-${kind}` },
    create: {
      id: `account-${kind}`,
      accountId: u.id,
      providerId: "credential",
      userId: u.id,
      password: await hashPassword(access[kind].password),
    },
    update: {},
  });
}
writeFileSync(accessPath, JSON.stringify(access, null, 2));
for (const c of categories)
  await db.category.upsert({
    where: { id: c.id },
    create: { id: c.id, name: c.en, nameBn: c.bn },
    update: {},
  });
const names: Record<string, string[]> = {
  tiles: [
    "Ivory porcelain floor tiles",
    "Terracotta matte wall tiles",
    "সাদা মার্বেল ফিনিশ টাইলস",
    "Sage green subway tiles",
    "Warm grey ceramic tiles",
  ],
  sanitary: [
    "White countertop wash basin",
    "Unused chrome mixer tap",
    "Compact wall-hung basin",
    "Ceramic pedestal sink",
    "Rain shower fitting set",
  ],
  doors: [
    "Solid wood panel door",
    "White painted interior door",
    "Aluminium window frame",
    "Teak veneer bedroom door",
    "Frosted bathroom door",
  ],
  lighting: [
    "Brass pendant ceiling light",
    "Warm white wall sconces",
    "Unused track lighting set",
    "Matte black pendant light",
    "LED ceiling panel lights",
  ],
  flooring: [
    "Natural oak laminate planks",
    "Walnut finish flooring packs",
    "Engineered wood floorboards",
    "Light ash laminate flooring",
    "Bamboo flooring offcuts",
  ],
  fixtures: [
    "Brushed brass cabinet handles",
    "Soft-close drawer runners",
    "Stainless kitchen sink",
    "Matte black door handles",
    "Unused towel rail set",
  ],
};
const areas = ["Dhanmondi", "Uttara", "Mirpur", "Gulshan", "Bashundhara"];
for (let i = 0; i < 30; i++) {
  const category = categories[i % 6].id,
    n = Math.floor(i / 6),
    id = `demo-${category}-${n + 1}`;
  if (await db.listing.findUnique({ where: { id } })) continue;
  const title = names[category][n],
    tile = category === "tiles",
    sellerId = n % 2 ? "demo-seller2" : "demo-seller",
    price =
      (tile
        ? [1250, 980, 1500, 1100, 850][n]
        : [2200, 1600, 3400, 1800, 950][n]) * 100;
  const description = `${title}. Usable surplus from a fictional Dhaka renovation project. Please confirm measurements and condition before pickup. Illustrative photograph, not a photograph of actual stock. This is synthetic demonstration data.`;
  const data = {
    id,
    sellerId,
    categoryId: category,
    title,
    description,
    condition: n % 3 === 0 ? "UNOPENED" : n % 3 === 1 ? "UNUSED" : "USED_GOOD",
    status: "APPROVED",
    price,
    unit: tile ? "box" : category === "flooring" ? "pack" : "piece",
    minimum: 1,
    increment: 1,
    partial: true,
    area: areas[n],
    district: "Dhaka",
    pickupNotes:
      "Pickup by arrangement, 10 am–6 pm. Buyer arranges transport and loading.",
    privatePickup:
      "Fictional pickup address: Demo building, Lane 4. Confirm through messages before travelling.",
    disclosures:
      "Demo listing with illustrative photography. Verify condition in person. No safety certification claimed.",
    brand: tile ? "Demo Ceramics" : null,
    modelCode: tile ? `RC-${n + 1}600` : null,
    batchCode: tile && n === 0 ? "IV-26-A" : null,
    widthMm: tile
      ? 600
      : category === "doors"
        ? 900
        : category === "flooring"
          ? 180
          : null,
    lengthMm: tile
      ? 600
      : category === "doors"
        ? 2100
        : category === "flooring"
          ? 1200
          : null,
    piecesPerBox: tile ? 4 : null,
    finish: tile ? (n % 2 ? "Matte" : "Polished") : null,
    colour: tile ? ["Ivory", "Terracotta", "White", "Sage", "Grey"][n] : null,
    material: category === "doors" ? "Wood" : null,
    searchText: normalize(
      `${title} ${description} ${areas[n]} ${tile ? `Demo Ceramics RC-${n + 1}600` : ""}`,
    ),
    publishedAt: new Date(Date.now() - i * 3600000),
    lot: { create: { total: tile ? 8 + n * 2 : 4 + n } },
  };
  await db.listing.create({ data });
  await putImage(
    sellerId,
    readFileSync(`public/materials/${category}.jpg`),
    `Illustrative ${category} photograph for synthetic demo listing`,
    id,
  );
}
for (const [i, title, category] of [
  [1, "Looking for 600 × 600 ivory tiles", "tiles"],
  [2, "A wooden door for a small studio", "doors"],
  [3, "Warm brass pendant lights", "lighting"],
] as const)
  await db.wanted.upsert({
    where: { id: `demo-wanted-${i}` },
    create: {
      id: `demo-wanted-${i}`,
      userId: "demo-buyer",
      title,
      categoryId: category,
      area: areas[i - 1],
      quantity: 3,
      unit: category === "tiles" ? "box" : "piece",
      description:
        "Synthetic wanted request. Looking for a usable matching material for a fictional renovation.",
      ...(category === "tiles"
        ? { widthMm: 600, lengthMm: 600, modelCode: "RC-1600" }
        : {}),
    },
    update: {},
  });
const demoBuyer = await db.user.findUniqueOrThrow({
  where: { id: "demo-buyer" },
});
const demoSeller = await db.user.findUniqueOrThrow({
  where: { id: "demo-seller" },
});
for (const [listingId, state] of [
  ["demo-fixtures-1", "PENDING"],
  ["demo-sanitary-1", "READY"],
  ["demo-lighting-1", "COMPLETED"],
  ["demo-doors-1", "CANCELLED"],
]) {
  const requestKey = `seed-${listingId}-${state}`;
  if (
    await db.order.findUnique({
      where: { buyerId_requestKey: { buyerId: demoBuyer.id, requestKey } },
    })
  )
    continue;
  const order = await requestPurchase(demoBuyer, listingId, 1, requestKey);
  if (state !== "PENDING") await changeOrder(demoSeller, order.id, "accept");
  if (["READY", "COMPLETED"].includes(state))
    await changeOrder(demoSeller, order.id, "ready");
  if (state === "COMPLETED") {
    await changeOrder(demoBuyer, order.id, "handover");
    await changeOrder(demoSeller, order.id, "handover");
  }
  if (state === "CANCELLED") await changeOrder(demoBuyer, order.id, "cancel");
}
console.log(
  "Seeded 30 fictional listings and local accounts. Access credentials: .local/demo-access.json (not committed).",
);
await db.$disconnect();
