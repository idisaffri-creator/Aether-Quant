import { test, expect } from "@playwright/test";

test.describe("Aether Energy E2E smoke", () => {
  test("landing page loads with hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Aether/i);
    await expect(page.getByRole("heading", { name: /energy commodities/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Launch Dashboard/i }).first()).toBeVisible();
    // CTA links work (not dead)
    const cta = page.getByRole("link", { name: /Launch Dashboard/i }).first();
    await expect(cta).toHaveAttribute("href", /\/login/);
  });

  test("status page is up", async ({ page }) => {
    const res = await page.request.get("/ready");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
  });

  test("login + dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("demo@aether-energy.ai");
    await page.getByLabel(/password/i).fill("demo123");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
    // Dashboard should show live data
    await expect(page.getByText(/Trading Dashboard|Executive Overview/i).first()).toBeVisible();
  });

  test("leaderboard renders", async ({ page }) => {
    await page.goto("/dashboard/leaderboard");
    // Either shows leaderboard table or empty state
    const hasLeaderboard = await page.getByText(/Leaderboard/i).first().isVisible();
    expect(hasLeaderboard).toBeTruthy();
  });

  test("tournaments page renders", async ({ page }) => {
    await page.goto("/dashboard/tournaments");
    await expect(page.getByText(/Tournaments/i).first()).toBeVisible();
  });

  test("backtest page loads", async ({ page }) => {
    await page.goto("/dashboard/backtest");
    await expect(page.getByText(/Backtest/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Run backtest/i })).toBeVisible();
  });

  test("marketplace page loads", async ({ page }) => {
    await page.goto("/dashboard/marketplace");
    await expect(page.getByText(/Marketplace/i).first()).toBeVisible();
  });

  test("API: leaderboard/me works for authed user", async ({ request }) => {
    // Login
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "demo@aether-energy.ai", password: "demo123" },
    });
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();

    // Get my leaderboard stats
    const meRes = await request.get("/api/leaderboard/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(typeof me.totalPnl).toBe("number");
  });

  test("API: backtest enqueue + poll", async ({ request }) => {
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "demo@aether-energy.ai", password: "demo123" },
    });
    const { token } = await loginRes.json();

    // Enqueue
    const enqRes = await request.post("/api/backtest/run", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        strategy: "Mean Reversion",
        symbol: "WTI",
        startDate: "2024-01-01",
        endDate: "2024-03-01",
        initialBalance: 100000,
      },
    });
    expect(enqRes.status()).toBe(202);
    const { jobId } = await enqRes.json();
    expect(jobId).toBeTruthy();

    // Poll for completion (max 30s)
    for (let i = 0; i < 30; i++) {
      const r = await request.get(`/api/backtest/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = await r.json();
      if (status.state === "completed") {
        expect(status.result).toBeTruthy();
        return;
      }
      if (status.state === "failed") {
        throw new Error(`Backtest failed: ${status.error}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error("Backtest did not complete in 30s");
  });

  test("API: tournaments list works for authed user", async ({ request }) => {
    const loginRes = await request.post("/api/auth/login", {
      data: { email: "demo@aether-energy.ai", password: "demo123" },
    });
    const { token } = await loginRes.json();
    const r = await request.get("/api/tournaments", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.status()).toBe(200);
    const data = await r.json();
    expect(Array.isArray(data.tournaments)).toBeTruthy();
  });
});
