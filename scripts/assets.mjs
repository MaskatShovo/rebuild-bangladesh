import { mkdirSync, writeFileSync } from "node:fs";
const photos = {
  hero: "photo-1600210492486-724fe5c67fb0",
  tiles: "photo-1620626011761-996317b8d101",
  sanitary: "photo-1584622650111-993a426fbf0a",
  doors: "photo-1506377295352-e3154d43ea9e",
  lighting: "photo-1507473885765-e6ed057f782c",
  flooring: "photo-1516455207990-7a41ce80f7ee",
  fixtures: "photo-1600566753086-00f18fb6b3ea",
};
mkdirSync("public/materials", { recursive: true });
await Promise.all(
  Object.entries(photos).map(async ([name, id]) => {
    const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${name === "hero" ? 1200 : 800}&q=85`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    writeFileSync(
      `public/materials/${name}.jpg`,
      Buffer.from(await response.arrayBuffer()),
    );
    console.log(`${name} saved`);
  }),
);
writeFileSync(
  "public/materials/sources.json",
  JSON.stringify(
    {
      license: "https://unsplash.com/license",
      usage:
        "Illustrative photographs for explicitly synthetic local demo listings; not actual sale-item photographs.",
      photos,
    },
    null,
    2,
  ),
);
