import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { dispatchJobs } from "@/lib/dispatch-jobs";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export const maxDuration = 60;
export async function POST(request: Request) {
  if (process.env.ACCOUNTS_ENABLED === "false")
    return Response.json(
      {
        error: {
          code: "ACCOUNTS_UNAVAILABLE",
          message: "Accounts are not enabled on this browsing demo.",
        },
      },
      { status: 503 },
    );
  const response = await handlers.POST(request);
  if (response.ok) dispatchJobs();
  return response;
}
