import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const access: Record<string, { email: string; password: string }> = JSON.parse(
  readFileSync(".local/demo-access.json", "utf8"),
);
async function signIn(page: Page, kind: string) {
  await page.goto("/auth");
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByLabel("Email address").fill(access[kind].email);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/sign-in/email") &&
        response.request().method() === "POST",
    );
    await page
      .getByLabel("Password", { exact: true })
      .fill(access[kind].password);
    await page
      .getByRole("button", { name: "Sign in", exact: true })
      .last()
      .click();
    const response = await responsePromise;
    if (response.status() !== 429) break;
    const retryAfter = Number(response.headers()["retry-after"] ?? 11);
    await page.waitForTimeout(Math.min(30, Math.max(1, retryAfter)) * 1000);
  }
  await expect(page).toHaveURL(/dashboard/);
}
test("desktop and mobile storefront, accessible navigation, search, compare and Bangla", async ({
  page,
}) => {
  mkdirSync("docs/screenshots", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Left over.",
  );
  await page.screenshot({
    path: "docs/screenshots/desktop-home.png",
    fullPage: true,
  });
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  writeFileSync(
    "docs/screenshots/axe-home.json",
    JSON.stringify(axe.violations, null, 2),
  );
  expect(axe.violations).toEqual([]);
  await page.getByRole("textbox", { name: "Search materials" }).fill("RC-1600");
  await page
    .getByRole("button", { name: "Find materials", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Ivory porcelain floor tiles",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to comparison" }).first().click();
  await page.goto("/browse?category=tiles");
  await page.getByRole("button", { name: "Add to comparison" }).nth(1).click();
  await page.goto("/compare");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Price per m²")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/mobile-home.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByText("Find materials")
    .click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByLabel("Search materials")).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "বাংলা", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "অবশিষ্ট",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  expect(errors).toEqual([]);
});
test("seller creates image listing, moderation, buyer partial request, seller reservation and dual handover", async ({
  browser,
}) => {
  const sellerContext = await browser.newContext(),
    buyerContext = await browser.newContext(),
    modContext = await browser.newContext();
  const seller = await sellerContext.newPage(),
    buyer = await buyerContext.newPage(),
    mod = await modContext.newPage();
  await signIn(seller, "seller");
  await seller.goto("/sell");
  const title = `E2E ivory tiles ${Date.now()}`;
  await seller.getByLabel("Listing title").fill(title);
  await seller
    .getByLabel("Description")
    .fill(
      "Eight unopened boxes of synthetic test tiles. Batch E2E, inspect on pickup.",
    );
  await seller.getByLabel("Width (mm)").fill("600");
  await seller.getByLabel("Length / height (mm)").fill("600");
  await seller.getByLabel("Pieces per box").fill("4");
  await seller.getByLabel("Price per sale unit").fill("1250");
  await seller.getByLabel("Total quantity").fill("8");
  await seller
    .getByLabel("Add a photo")
    .setInputFiles("public/materials/tiles.jpg");
  await expect(seller.getByText("Photo added.")).toBeVisible();
  await seller
    .getByLabel("Pickup arrangements")
    .fill("Arrange pickup between 10 am and 5 pm.");
  await seller
    .getByLabel("Exact pickup address")
    .fill("Test-only private address, House 7.");
  await seller
    .getByLabel("Condition, defects")
    .fill("Synthetic test stock. No professional safety certification.");
  await seller
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(seller).toHaveURL(/dashboard\/listings/);
  await expect(seller.getByText(title, { exact: true })).toBeVisible();
  const mine = await (await seller.request.get("/api/v1/me")).json();
  const l = mine.data.listings.find(
    (x: { title: string }) => x.title === title,
  );
  expect(l.status).toBe("PENDING");
  expect((await buyer.request.get(`/api/v1/listings/${l.id}`)).status()).toBe(
    404,
  );
  await signIn(mod, "moderator");
  await mod.goto("/admin");
  const row = mod
    .locator("form")
    .filter({ has: mod.getByRole("heading", { name: title, exact: true }) });
  await row
    .getByLabel("Reason visible to seller")
    .fill("Verified test image and material details.");
  await row.getByRole("button", { name: "Record decision" }).click();
  await expect(row).toHaveCount(0);
  await signIn(buyer, "buyer");
  await buyer.goto(`/listings/${l.id}`);
  await buyer.getByLabel("Your quantity").fill("3");
  await buyer.getByRole("button", { name: "Request to buy" }).click();
  await expect(buyer).toHaveURL(/orders\//);
  const orderPath = new URL(buyer.url()).pathname;
  await seller.goto(orderPath);
  await seller.getByRole("button", { name: "Accept & reserve" }).click();
  await expect(
    seller.getByRole("button", { name: "Mark ready for pickup" }),
  ).toBeVisible();
  await seller.getByRole("button", { name: "Mark ready for pickup" }).click();
  await expect(
    seller.getByRole("button", { name: "I confirm physical handover" }),
  ).toBeVisible();
  await seller
    .getByRole("button", { name: "I confirm physical handover" })
    .click();
  await buyer.reload();
  await buyer
    .getByRole("button", { name: "I confirm physical handover" })
    .click();
  await expect(buyer.getByLabel("Your review")).toBeVisible();
  await buyer
    .getByLabel("Your review")
    .fill("Clear communication and matching tile batch.");
  await buyer.getByRole("button", { name: "Post review" }).click();
  await expect(buyer.getByText("5/5 · Clear communication")).toBeVisible();
  const publicData = (
    await (await buyer.request.get(`/api/v1/listings/${l.id}`)).json()
  ).data;
  expect(publicData.lot).toMatchObject({ total: 8, reserved: 0, sold: 3 });
  expect(publicData).not.toHaveProperty("privatePickup");
  await buyer.screenshot({
    path: "docs/screenshots/completed-order.png",
    fullPage: true,
  });
  expect((await mod.request.get(`/api/v1${orderPath}`)).status()).toBe(404);
  const edit = await seller.request.put(`/api/v1/listings/${l.id}`, {
    headers: { Origin: "http://localhost:3000" },
    data: {
      ...l,
      total: l.lot.total,
      imageIds: l.images.map((i: { id: string }) => i.id),
      description: l.description + " Updated condition notes.",
    },
  });
  expect(edit.ok()).toBe(true);
  expect((await edit.json()).data.status).toBe("PENDING");
  expect((await buyer.request.get(`/api/v1/listings/${l.id}`)).status()).toBe(
    404,
  );
  await sellerContext.close();
  await buyerContext.close();
  await modContext.close();
});

test("promotion callbacks cannot activate by redirect; simulator deduplicates and confirms refund", async ({
  page,
}) => {
  await signIn(page, "seller");
  const headers = { Origin: "http://localhost:3000" };
  const response = await page.request.post("/api/v1/payments", {
    headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
    data: { listingId: "demo-tiles-1" },
  });
  expect(response.status()).toBe(201);
  const p = (await response.json()).data;
  const redirect = await page.request.post("/api/v1/payments/return", {
    maxRedirects: 0,
    data: { status: "VALID", tran_id: p.id },
  });
  expect(redirect.status()).toBe(303);
  const before = (
    await (await page.request.get("/api/v1/me")).json()
  ).data.payments.find((x: { id: string }) => x.id === p.id);
  expect(before.promotion).toBeNull();
  const eventId = crypto.randomUUID();
  for (let n = 0; n < 2; n++)
    expect(
      (
        await page.request.post(`/api/v1/payments/${p.id}/simulate`, {
          headers,
          data: { state: "SUCCESS", eventId },
        })
      ).ok(),
    ).toBe(true);
  const success = (
    await (await page.request.get("/api/v1/me")).json()
  ).data.payments.find((x: { id: string }) => x.id === p.id);
  expect(success.promotion.active).toBe(true);
  expect(
    (
      await page.request.post(`/api/v1/payments/${p.id}/simulate`, {
        headers,
        data: { state: "REFUNDED", eventId: crypto.randomUUID() },
      })
    ).ok(),
  ).toBe(true);
  const refunded = (
    await (await page.request.get("/api/v1/me")).json()
  ).data.payments.find((x: { id: string }) => x.id === p.id);
  expect(refunded.state).toBe("REFUNDED");
  expect(refunded.promotion.active).toBe(false);
});

test("suspension immediately revokes an existing member session and audit is recorded", async ({
  browser,
}) => {
  const adminContext = await browser.newContext(),
    memberContext = await browser.newContext();
  const admin = await adminContext.newPage(),
    member = await memberContext.newPage();
  await signIn(admin, "admin");
  await signIn(member, "seller2");
  const headers = { Origin: "http://localhost:3000" };
  try {
    expect(
      (
        await admin.request.post("/api/v1/admin/users/demo-seller2", {
          headers,
          data: {
            suspended: true,
            reason: "Temporary automated authorization test",
          },
        })
      ).ok(),
    ).toBe(true);
    expect((await member.request.get("/api/v1/me")).status()).toBe(401);
    expect(
      (
        await member.request.post("/api/v1/wanted", { headers, data: {} })
      ).status(),
    ).toBe(401);
    const audit = (await (await admin.request.get("/api/v1/admin")).json()).data
      .audit;
    expect(
      audit.some(
        (a: { action: string; targetId: string }) =>
          a.action === "user:suspension" && a.targetId === "demo-seller2",
      ),
    ).toBe(true);
  } finally {
    await admin.request.post("/api/v1/admin/users/demo-seller2", {
      headers,
      data: {
        suspended: false,
        reason: "Completed automated authorization test",
      },
    });
    await adminContext.close();
    await memberContext.close();
  }
});
test("direct API authorization, saved listings, wanted, messaging and upload rejection", async ({
  browser,
}) => {
  const buyerContext = await browser.newContext(),
    sellerContext = await browser.newContext(),
    otherContext = await browser.newContext();
  const buyer = await buyerContext.newPage(),
    seller = await sellerContext.newPage(),
    other = await otherContext.newPage();
  await signIn(buyer, "buyer");
  await signIn(seller, "seller");
  await signIn(other, "seller2");
  const headers = { Origin: "http://localhost:3000" };
  expect(
    (
      await buyer.request.post("/api/v1/listings/demo-tiles-1/pause", {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect((await buyer.request.get("/api/v1/admin")).status()).toBe(403);
  expect(
    (
      await buyer.request.post("/api/v1/saved/demo-tiles-1", {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await buyer.request.post("/api/v1/saved/demo-tiles-1", {
        headers: { Origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const c = (
    await (
      await buyer.request.post("/api/v1/conversations", {
        headers,
        data: {
          listingId: "demo-tiles-1",
          body: "Can you confirm the batch code?",
        },
      })
    ).json()
  ).data;
  expect(
    (await other.request.get(`/api/v1/conversations/${c.id}`)).status(),
  ).toBe(404);
  await seller.goto(`/messages/${c.id}`);
  await expect(
    seller.getByText("Can you confirm the batch code?").first(),
  ).toBeVisible();
  await seller
    .getByRole("textbox", { name: "Your message" })
    .fill("The batch is IV-26-A.");
  await seller.getByRole("button", { name: "Send", exact: true }).click();
  await expect(seller.getByText("The batch is IV-26-A.").first()).toBeVisible();
  const wanted = await buyer.request.post("/api/v1/wanted", {
    headers,
    data: {
      title: "E2E matching ivory floor tiles",
      description: "Need a matching batch for test renovation.",
      categoryId: "tiles",
      area: "Dhanmondi",
      quantity: 3,
      unit: "box",
      modelCode: "RC-1600",
      widthMm: 600,
      lengthMm: 600,
    },
  });
  expect(wanted.status()).toBe(201);
  expect(
    (
      await buyer.request.post("/api/v1/uploads", {
        headers,
        multipart: {
          file: {
            name: "unsafe.svg",
            mimeType: "image/svg+xml",
            buffer: Buffer.from(
              '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            ),
          },
        },
      })
    ).status(),
  ).toBe(400);
  await buyerContext.close();
  await sellerContext.close();
  await otherContext.close();
});
function decodeMail(raw: string) {
  const split = raw.split(/\r?\n\r?\n/);
  const head = split.shift() || "";
  let body = split.join("\r\n\r\n");
  if (/Content-Transfer-Encoding: base64/i.test(head))
    body = Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf8");
  else
    body = body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
  return body;
}
test("registration, local email verification, reset token single use and session revocation", async ({
  page,
  request,
}) => {
  const email = `e2e-${Date.now()}@example.test`,
    password = "Local-test-password-2026!";
  const headers = { Origin: "http://localhost:3000" };
  await page.goto("/auth");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Your name").fill("E2E new member");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("Check your email for a verification link"),
  ).toBeVisible();
  let verification = "";
  await expect
    .poll(
      async () => {
        const inbox = await (await request.get("http://127.0.0.1:8025")).json();
        const message = inbox.find(
          (m: { raw: string }) =>
            m.raw.includes(email) && m.raw.includes("Verify your ReBuild"),
        );
        if (message)
          verification =
            decodeMail(message.raw).match(
              /http:\/\/localhost:3000\/api\/auth\/verify-email[^\s]+/,
            )?.[0] || "";
        return verification;
      },
      { timeout: 30000 },
    )
    .not.toBe("");
  await page.goto(verification);
  await page.goto("/auth");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/dashboard/);
  const reset = await page.request.post("/api/auth/request-password-reset", {
    headers,
    data: { email, redirectTo: "/auth" },
  });
  expect(reset.ok()).toBe(true);
  let resetUrl = "";
  await expect
    .poll(
      async () => {
        const inbox = await (await request.get("http://127.0.0.1:8025")).json();
        const message = inbox.find(
          (m: { raw: string }) =>
            m.raw.includes(email) && m.raw.includes("Reset your ReBuild"),
        );
        if (message)
          resetUrl =
            decodeMail(message.raw).match(
              /http:\/\/localhost:3000\/api\/auth\/reset-password[^\s]+/,
            )?.[0] || "";
        return resetUrl;
      },
      { timeout: 30000 },
    )
    .not.toBe("");
  await page.goto(resetUrl);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Another-local-password-2026!");
  const token = new URL(page.url()).searchParams.get("token");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Password reset. Sign in")).toBeVisible();
  expect(
    (
      await request.post("/api/auth/reset-password", {
        headers,
        data: { newPassword: "Third-local-password-2026!", token },
      })
    ).ok(),
  ).toBe(false);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Another-local-password-2026!");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/dashboard/);
  const sessions = await (
    await page.request.get("/api/auth/list-sessions")
  ).json();
  expect(sessions.length).toBeGreaterThan(0);
  expect(
    (
      await page.request.post("/api/auth/revoke-session", {
        headers,
        data: { token: sessions[0].token },
      })
    ).ok(),
  ).toBe(true);
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});
