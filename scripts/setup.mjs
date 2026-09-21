import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
if (process.env.NODE_ENV === "production")
  throw new Error("Local setup is disabled in production");
mkdirSync(".local", { recursive: true });
if (!existsSync(".env")) {
  const password = randomBytes(24).toString("hex");
  const docker = process.argv.includes("--docker");
  writeFileSync(
    ".env",
    `POSTGRES_PASSWORD=${password}\nDATABASE_URL=postgresql://rebuild:${password}@127.0.0.1:54329/rebuild\nBETTER_AUTH_SECRET=${randomBytes(40).toString("hex")}\nBETTER_AUTH_URL=http://localhost:3000\nSMTP_HOST=127.0.0.1\nSMTP_PORT=1025\nEMAIL_FROM=ReBuild Bangladesh <hello@rebuild.local>\nS3_ENDPOINT=http://127.0.0.1:9000\nS3_REGION=us-east-1\nS3_BUCKET=rebuild\nS3_ACCESS_KEY=${docker ? "rebuild-local" : "S3RVER"}\nS3_SECRET_KEY=${docker ? randomBytes(24).toString("hex") : "S3RVER"}\nRESERVATION_HOURS=24\nDEMO_MODE=true\nPAYMENT_SIMULATOR=true\n`,
  );
  console.log("Created local .env with random database and auth secrets.");
} else console.log("Existing .env preserved.");
