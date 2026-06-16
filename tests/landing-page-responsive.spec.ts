import { test, expect, type Page } from "@playwright/test";

/* ---------------------------------------------------------------
   Landing-Page Screenshot Regression Suite
   Captures baseline screenshots at 4 viewports and verifies
   that key sections render without overflow or layout breaks.
   --------------------------------------------------------------- */

const SECTION_IDS = [
  { id: "terminal", name: "terminal" },
  { id: "features", name: "features" },
  { id: "platform", name: "platform" },
] as const;

async function scrollToSection(page: Page, sectionId: string) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  }, sectionId);
  // Wait for any animations to settle
  await page.waitForTimeout(400);
}

async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle");
  // Wait for hero section to be visible (confirms page rendered)
  await page.waitForSelector("h1", { timeout: 10000 });
}

/** Scroll to bottom and back to trigger all React.lazy() sections */
async function triggerAllLazySections(page: Page) {
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y <= height; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
}

/* ── Full-Page Screenshot ─────────────────────────────────── */

test.describe("Full-page screenshots", () => {
  test("captures full landing page", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot("landing-page-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
    });
  });
});

/* ── Hero Section ─────────────────────────────────────────── */

test.describe("Hero section", () => {
  test("renders hero correctly", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await expect(page).toHaveScreenshot("hero-viewport.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});

/* ── Terminal Section ─────────────────────────────────────── */

test.describe("Terminal section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await scrollToSection(page, "terminal");
  });

  test("renders Market Overview tab", async ({ page }) => {
    const section = page.locator("#terminal");
    await expect(section).toHaveScreenshot("terminal-overview.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("renders Deep Analytics tab", async ({ page }) => {
    await page.getByText("Deep Analytics").click();
    await page.waitForTimeout(500);
    const section = page.locator("#terminal");
    await expect(section).toHaveScreenshot("terminal-analytics.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("renders Execution Engine tab", async ({ page }) => {
    await page.getByText("Execution Engine").click();
    await page.waitForTimeout(500);
    const section = page.locator("#terminal");
    await expect(section).toHaveScreenshot("terminal-execution.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("no horizontal overflow", async ({ page }) => {
    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth > body.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

/* ── Features Section ─────────────────────────────────────── */

test.describe("Features section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await scrollToSection(page, "features");
  });

  test("renders bento grid", async ({ page }) => {
    const section = page.locator("#features");
    await expect(section).toHaveScreenshot("features-bento.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("no horizontal overflow", async ({ page }) => {
    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth > body.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

/* ── Platform Section ─────────────────────────────────────── */

test.describe("Platform section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await scrollToSection(page, "platform");
  });

  test("renders Strategy Builder tab", async ({ page }) => {
    const section = page.locator("#platform");
    await expect(section).toHaveScreenshot("platform-strategy.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("renders AI Assistant tab", async ({ page }) => {
    await page.getByRole("button", { name: "AI Assistant" }).click();
    await page.waitForTimeout(500);
    const section = page.locator("#platform");
    await expect(section).toHaveScreenshot("platform-ai.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("renders Market Data tab", async ({ page }) => {
    await page.getByRole("button", { name: "Market Data" }).click();
    await page.waitForTimeout(500);
    const section = page.locator("#platform");
    await expect(section).toHaveScreenshot("platform-data.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("renders Risk Management tab", async ({ page }) => {
    await page.getByRole("button", { name: "Risk Management" }).click();
    await page.waitForTimeout(500);
    const section = page.locator("#platform");
    await expect(section).toHaveScreenshot("platform-risk.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("no horizontal overflow", async ({ page }) => {
    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth > body.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});

/* ── CTA Section ──────────────────────────────────────────── */

test.describe("CTA section", () => {
  test("renders CTA with email form", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector("#cta-email", { timeout: 5000 });
    await expect(page).toHaveScreenshot("cta-section.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("email form is usable on mobile", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForSelector("#cta-email", { timeout: 5000 });
    const emailInput = page.locator("#cta-email");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("test@example.com");
    await expect(emailInput).toHaveValue("test@example.com");
  });
});

/* ── Cross-Section Layout Checks ──────────────────────────── */

test.describe("Layout integrity", () => {
  test("no console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await waitForPageReady(page);
    const criticalErrors = errors.filter(
      (e) => !e.includes("autocomplete") && !e.includes("React does not recognize")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("all section IDs are present in DOM", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    for (const section of SECTION_IDS) {
      const el = await page.$(`#${section.id}`);
      expect(el).not.toBeNull();
    }
  });

  test("no elements wider than viewport", async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    const sectionIds = ["terminal", "features", "platform"];
    for (const id of sectionIds) {
      await scrollToSection(page, id);
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });
      expect(hasOverflow).toBe(false);
    }
  });
});

/* ── Horizontal Overflow Detection @ 320px ────────────────── */
/*
 * Detects horizontal scrollbar-causing overflow at 320px.
 *
 * Strategy:
 *  1. Page-level check: documentElement.scrollWidth vs clientWidth
 *     (this is what actually produces a horizontal scrollbar)
 *  2. Section-level check: each <section>'s own bounding rect
 *     against the viewport (catches sections wider than viewport)
 *  3. Scroll-through check: incremental scroll with section
 *     bounding-rect checks at each step
 *
 * We intentionally do NOT check every child element's rect,
 * because getBoundingClientRect() returns the full CSS box even
 * for elements inside overflow:hidden containers — producing
 * false positives for chart/SVG content that is visually clipped
 * but not causing a scrollbar.
 *
 * The beforeEach scrolls to bottom and back to trigger all
 * React.lazy() sections so they're in the DOM before checks.
 */

const LANDING_SECTIONS = [
  { id: "terminal", name: "TerminalSection" },
  { id: "agents", name: "AgentFleetSection" },
  { id: "features", name: "FeaturesSection" },
  { id: "platform", name: "PlatformSection" },
  { id: "pricing", name: "PricingSection" },
  { id: "roadmap", name: "RoadmapSection" },
] as const;

test.describe("Horizontal overflow @ 320px", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageReady(page);
    // Trigger all lazy-loaded sections so they're in the DOM
    await triggerAllLazySections(page);
  });

  test("page has no horizontal scrollbar", async ({ page }) => {
    const result = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  });

  test("no <section> element extends past the viewport right edge", async ({
    page,
  }) => {
    const overflowing = await page.evaluate(() => {
      const vw = window.innerWidth;
      return Array.from(document.querySelectorAll("section"))
        .map((el, i) => {
          const rect = el.getBoundingClientRect();
          return {
            index: i,
            id: el.id || "(no id)",
            rectRight: Math.round(rect.right),
            overflows: rect.right > vw + 1,
          };
        })
        .filter((s) => s.overflows);
    });

    if (overflowing.length > 0) {
      const details = overflowing
        .map(
          (s) =>
            `  <section id="${s.id}"> index=${s.index} right=${s.rectRight}px`
        )
        .join("\n");
      expect(
        overflowing,
        `${overflowing.length} section(s) overflow at 320px:\n${details}`
      ).toHaveLength(0);
    }
  });

  test("scrolling through page does not reveal new overflow", async ({
    page,
  }) => {
    const totalHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );
    const step = 600;
    const violations: string[] = [];

    for (let y = 0; y <= totalHeight; y += step) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(150);

      const overflow = await page.evaluate(() => {
        const vw = window.innerWidth;
        const sections = Array.from(document.querySelectorAll("section"));
        for (const s of sections) {
          const rect = s.getBoundingClientRect();
          // Section top is at or above viewport bottom, and bottom is below viewport top
          if (rect.top <= 0 && rect.bottom > 0 && rect.right > vw + 1) {
            return s.id || "(no id)";
          }
        }
        return null;
      });

      if (overflow) {
        violations.push(`scrollY=${y} section="${overflow}"`);
      }
    }

    expect(
      violations,
      `Section overflow detected at scroll positions:\n${violations.join("\n")}`
    ).toHaveLength(0);
  });

  test("each named section fits within viewport when scrolled into view", async ({
    page,
  }) => {
    for (const section of LANDING_SECTIONS) {
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
      }, section.id);
      await page.waitForTimeout(300);

      const overflow = await page.evaluate((sectionId) => {
        const vw = window.innerWidth;
        const el = document.getElementById(sectionId);
        if (!el) return { hasOverflow: false, detail: "section not found in DOM" };

        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 1) {
          return {
            hasOverflow: true,
            detail: `rect right=${Math.round(rect.right)}px > viewport ${vw}px`,
          };
        }
        return { hasOverflow: false, detail: "" };
      }, section.id);

      expect(
        overflow.hasOverflow,
        `${section.name} (#${section.id}): ${overflow.detail}`
      ).toBe(false);
    }
  });
});
