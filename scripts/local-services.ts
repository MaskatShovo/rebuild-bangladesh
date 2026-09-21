import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { SMTPServer } from "smtp-server";
import { createServer } from "node:http";
import { existsSync, mkdirSync, appendFileSync } from "node:fs";
// @ts-expect-error s3rver has no published declaration
import S3rver from "s3rver";
if (process.env.NODE_ENV === "production")
  throw new Error("Development services only");
const url = new URL(process.env.DATABASE_URL!);
mkdirSync(".local", { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: ".local/postgres",
  user: url.username,
  password: url.password,
  port: Number(url.port),
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(".local/postgres/PG_VERSION")) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
for (const name of ["rebuild", "rebuild_test"]) {
  const found = await client.query(
    "SELECT 1 FROM pg_database WHERE datname=$1",
    [name],
  );
  if (!found.rowCount)
    await client.query(
      `CREATE DATABASE "${name}" ENCODING 'UTF8' TEMPLATE template0`,
    );
}
await client.end();
const inbox: { id: string; raw: string; createdAt: string }[] = [];
const smtp = new SMTPServer({
  disabledCommands: ["AUTH", "STARTTLS"],
  onData(stream, session, callback) {
    let raw = "";
    stream.on("data", (chunk) => {
      raw += chunk.toString();
    });
    stream.on("end", () => {
      const item = {
        id: crypto.randomUUID(),
        raw,
        createdAt: new Date().toISOString(),
      };
      inbox.push(item);
      appendFileSync(".local/mail.jsonl", JSON.stringify(item) + "\n");
      callback();
    });
  },
});
smtp.listen(1025, "127.0.0.1");
const mail = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(inbox));
});
mail.listen(8025, "127.0.0.1");
mkdirSync(".local/objects", { recursive: true });
const s3 = new S3rver({
  port: 9000,
  address: "127.0.0.1",
  silent: true,
  directory: ".local/objects",
  configureBuckets: [{ name: "rebuild" }],
});
await s3.run();
console.log(
  "Local PostgreSQL :54329, SMTP :1025, JSON inbox http://127.0.0.1:8025, S3 :9000 ready.",
);
async function stop() {
  smtp.close();
  mail.close();
  await s3.close();
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
