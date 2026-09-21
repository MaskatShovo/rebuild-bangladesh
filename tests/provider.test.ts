import { afterEach, it, expect, vi } from "vitest";
import { SslCommerzSandbox } from "../src/lib/payments";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("sandbox contract fixture validates transaction through server API, not browser values", async () => {
  vi.stubEnv("SSLCOMMERZ_SANDBOX", "true");
  vi.stubEnv("SSLCOMMERZ_STORE_ID", "fixture");
  vi.stubEnv("SSLCOMMERZ_STORE_PASSWORD", "fixture-secret");
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        status: "VALID",
        val_id: "fixture-id",
        tran_id: "payment-1",
        amount: "199.00",
        currency: "BDT",
        risk_level: "0",
      }),
      { status: 200 },
    ),
  );
  expect(
    await new SslCommerzSandbox().verify({ val_id: "fixture-id" }),
  ).toEqual({
    eventId: "ssl:fixture-id",
    transactionId: "payment-1",
    amount: 19900,
    currency: "BDT",
    state: "SUCCESS",
  });
  expect(String(fetcher.mock.calls[0][0])).toContain(
    "/validator/api/validationserverAPI.php",
  );
});
it("sandbox contract rejects risky or mismatched validation response", async () => {
  vi.stubEnv("SSLCOMMERZ_SANDBOX", "true");
  vi.stubEnv("SSLCOMMERZ_STORE_ID", "fixture");
  vi.stubEnv("SSLCOMMERZ_STORE_PASSWORD", "fixture-secret");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        status: "VALID",
        val_id: "different",
        tran_id: "p",
        amount: "199",
        currency: "BDT",
        risk_level: "1",
      }),
    ),
  );
  await expect(
    new SslCommerzSandbox().verify({ val_id: "requested" }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});
