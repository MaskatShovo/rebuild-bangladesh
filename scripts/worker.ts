import "dotenv/config";
import { runJobs } from "../src/lib/worker";
const once = process.argv.includes("--once");
do {
  try {
    console.log(
      JSON.stringify({
        worker: true,
        time: new Date().toISOString(),
        ...(await runJobs()),
      }),
    );
  } catch {
    console.error(JSON.stringify({ worker: true, error: "Job cycle failed" }));
  }
  if (!once) await new Promise((r) => setTimeout(r, 5000));
} while (!once);
process.exit(0);
