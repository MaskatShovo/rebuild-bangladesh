import { after } from "next/server";

// Vercel keeps this callback alive within the request's function duration.
// Durable outbox leases make interrupted deliveries eligible for retry.
export function dispatchJobs() {
  if (process.env.JOB_DISPATCH !== "after") return;
  after(async () => {
    try {
      const { runJobs } = await import("./worker");
      await runJobs();
    } catch {
      console.error(
        JSON.stringify({ event: "job_dispatch_failed", retry: "outbox" }),
      );
    }
  });
}
