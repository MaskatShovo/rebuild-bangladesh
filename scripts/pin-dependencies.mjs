import { readFileSync, writeFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8")),
  lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
for (const section of ["dependencies", "devDependencies"])
  for (const name of Object.keys(pkg[section]))
    pkg[section][name] = lock.packages[`node_modules/${name}`].version;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
