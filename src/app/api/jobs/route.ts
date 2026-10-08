import { timingSafeEqual } from "node:crypto";
import { runJobs } from "@/lib/worker";
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") || "";
  if (!expected) return new Response(null, { status: 503 });
  const a = Buffer.from(received),
    b = Buffer.from(`Bearer ${expected}`);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return new Response(null, { status: 401 });
  return Response.json(await runJobs(), {
    headers: { "Cache-Control": "no-store" },
  });
}
