import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

/* ---------------------------------------------------------------
   Landing-Page Responsive Smoke Tests (Vitest + jsdom)
   Verifies each section component renders without errors and
   contains expected content. These are lightweight CI-friendly
   checks — use Playwright for visual screenshot regression.
   --------------------------------------------------------------- */

// ── Mock Helpers ───────────────────────────────────────────

/** Strip animation-only props and render a plain HTML element */
function createMotionComponent(tag: string) {
  return React.forwardRef<HTMLElement, React.PropsWithChildren<Record<string, unknown>>>(
    ({ children, initial, animate, exit, transition, viewport, whileInView, variants, whileHover, whileTap, layoutId, ...rest }, _ref) => {
      return React.createElement(tag, rest, children);
    }
  );
}

vi.mock("framer-motion", () => ({
  motion: {
    div: createMotionComponent("div"),
    section: createMotionComponent("section"),
    aside: createMotionComponent("aside"),
    span: createMotionComponent("span"),
    p: createMotionComponent("p"),
    h1: createMotionComponent("h1"),
    h2: createMotionComponent("h2"),
    h3: createMotionComponent("h3"),
    a: createMotionComponent("a"),
    button: createMotionComponent("button"),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useInView: () => true,
}));

// Mock Recharts — return lightweight stubs
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: React.PropsWithChildren) => <div data-testid="chart">{children}</div>,
  AreaChart: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Line: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ children, href, ...props }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("jotai", () => ({
  useAtom: () => [null, vi.fn()],
  useAtomValue: () => null,
}));

// ── TerminalSection ────────────────────────────────────────

describe("TerminalSection", () => {
  beforeEach(async () => {
    const { default: TerminalSection } = await import("@/components/sections/TerminalSection");
    render(<TerminalSection />);
  });

  it("renders section heading", () => {
    expect(screen.getByText(/quant execution/i)).toBeDefined();
  });

  it("renders all three tab buttons", () => {
    expect(screen.getByText("Market Overview")).toBeDefined();
    expect(screen.getByText("Deep Analytics")).toBeDefined();
    expect(screen.getByText("Execution Engine")).toBeDefined();
  });

  it("defaults to Market Overview tab with market list", () => {
    // WTI CRUDE appears in both list and chart header — use getAllByText
    expect(screen.getAllByText("WTI CRUDE").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("BRENT")).toBeDefined();
    expect(screen.getByText("GOLD")).toBeDefined();
  });

  it("switches to Execution Engine tab on click", () => {
    fireEvent.click(screen.getByText("Execution Engine"));
    // "Order Book — WTI" text may be split by the em dash
    expect(screen.getByText(/Order Book/)).toBeDefined();
    expect(screen.getByText(/Recent Executions/)).toBeDefined();
    expect(screen.getByText(/Connected Venues/)).toBeDefined();
  });

  it("renders execution metrics in responsive grid", () => {
    fireEvent.click(screen.getByText("Execution Engine"));
    expect(screen.getByText("Avg Fill Time")).toBeDefined();
    // "12ms" appears in both value and venue latency — use getAllByText
    expect(screen.getAllByText("12ms").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Slippage")).toBeDefined();
    expect(screen.getByText("Fill Rate")).toBeDefined();
  });
});

// ── FeaturesSection ────────────────────────────────────────

describe("FeaturesSection", () => {
  beforeEach(async () => {
    const { default: FeaturesSection } = await import("@/components/sections/FeaturesSection");
    render(<FeaturesSection />);
  });

  it("renders section heading", () => {
    expect(screen.getByText(/Built for/)).toBeDefined();
    expect(screen.getByText("Oil Traders")).toBeDefined();
  });

  it("renders all 9 feature cards", () => {
    expect(screen.getByText("Visual Quant Strategy Builder")).toBeDefined();
    expect(screen.getByText("Regime-Adaptive AI")).toBeDefined();
    expect(screen.getByText("Institutional Backtesting")).toBeDefined();
    expect(screen.getByText("Crude-First Market Data")).toBeDefined();
    expect(screen.getByText("Prop-Desk Risk Controls")).toBeDefined();
    expect(screen.getByText("Paper Trading With Market Replay")).toBeDefined();
    expect(screen.getByText(/50\+ Quant Templates/)).toBeDefined();
    expect(screen.getByText("Multi-User RBAC")).toBeDefined();
    expect(screen.getByText("Multi-Broker Execution")).toBeDefined();
  });

  it("renders feature tags", () => {
    expect(screen.getByText("CORE FEATURE")).toBeDefined();
    expect(screen.getByText("AI-POWERED")).toBeDefined();
    expect(screen.getByText("ENERGY FOCUS")).toBeDefined();
  });
});

// ── PlatformSection ────────────────────────────────────────

describe("PlatformSection", () => {
  beforeEach(async () => {
    const { default: PlatformSection } = await import("@/components/sections/PlatformSection");
    render(<PlatformSection />);
  });

  it("renders section heading", () => {
    expect(screen.getByText(/From Signal to Execution/)).toBeDefined();
  });

  it("renders all 4 tab buttons", () => {
    expect(screen.getByRole("button", { name: /Strategy Builder/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /AI Assistant/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Market Data/ })).toBeDefined();
    expect(screen.getByRole("button", { name: /Risk Management/ })).toBeDefined();
  });

  it("defaults to Strategy Builder tab", () => {
    expect(screen.getByText(/Build Quantitative Strategies Visually/)).toBeDefined();
  });

  it("switches to AI Assistant tab", () => {
    fireEvent.click(screen.getByRole("button", { name: /AI Assistant/ }));
    expect(screen.getByText(/AI That Thinks in Greeks and Spreads/)).toBeDefined();
    // Text may be split across elements — use regex
    expect(screen.getByText(/Strategy generated/)).toBeDefined();
  });

  it("switches to Risk Management tab", () => {
    fireEvent.click(screen.getByRole("button", { name: /Risk Management/ }));
    expect(screen.getByText(/Risk Controls Used by Commodity Desks/)).toBeDefined();
    expect(screen.getByText("Portfolio VaR (95%)")).toBeDefined();
  });
});

// ── CTASection ─────────────────────────────────────────────

describe("CTASection", () => {
  beforeEach(async () => {
    const { default: CTASection } = await import("@/components/sections/CTASection");
    render(<CTASection />);
  });

  it("renders CTA heading", () => {
    expect(screen.getByText(/Stop Trading Against/)).toBeDefined();
    expect(screen.getByText(/Black-Box Algorithms/)).toBeDefined();
  });

  it("renders social proof stats", () => {
    expect(screen.getByText("1,247")).toBeDefined();
    expect(screen.getByText("traders")).toBeDefined();
  });

  it("renders email input with correct accessibility attributes", () => {
    const input = screen.getByLabelText("Email address");
    expect(input).toBeDefined();
    expect(input.getAttribute("type")).toBe("email");
    expect(input.getAttribute("id")).toBe("cta-email");
    expect(input.getAttribute("name")).toBe("email");
  });

  it("renders benefits list", () => {
    expect(screen.getByText("Free paper trading forever")).toBeDefined();
    expect(screen.getByText("No credit card required")).toBeDefined();
    expect(screen.getByText("Cancel anytime")).toBeDefined();
  });

  it("renders submit button", () => {
    expect(screen.getByRole("button", { name: /Get Early Access/ })).toBeDefined();
  });
});

// ── Responsive CSS Class Verification ─────────────────────

describe("Responsive CSS classes", () => {
  it("TerminalSection execution metrics use lg breakpoint for 4-col grid", async () => {
    const { default: TerminalSection } = await import("@/components/sections/TerminalSection");
    const { container } = render(<TerminalSection />);
    fireEvent.click(screen.getByText("Execution Engine"));

    // The execution metrics grid should use lg:grid-cols-4 (not md:grid-cols-4)
    const grids = container.querySelectorAll("[class*='grid-cols-2']");
    const hasLgGrid = Array.from(grids).some((el) =>
      el.className.includes("lg:grid-cols-4")
    );
    expect(hasLgGrid).toBe(true);
  });

  it("PlatformSection strategy metrics use sm breakpoint for 3-col grid", async () => {
    const { default: PlatformSection } = await import("@/components/sections/PlatformSection");
    const { container } = render(<PlatformSection />);

    const grids = container.querySelectorAll("[class*='grid-cols']");
    const hasSmGrid = Array.from(grids).some((el) =>
      el.className.includes("sm:grid-cols-3")
    );
    expect(hasSmGrid).toBe(true);
  });

  it("CTASection social proof has flex-wrap for mobile", async () => {
    const { default: CTASection } = await import("@/components/sections/CTASection");
    const { container } = render(<CTASection />);

    const wrapped = container.querySelector("[class*='flex-wrap']");
    expect(wrapped).not.toBeNull();
  });

  it("CTASection agent row has overflow-x-auto for horizontal scroll", async () => {
    const { default: CTASection } = await import("@/components/sections/CTASection");
    const { container } = render(<CTASection />);

    const scrollable = container.querySelector("[class*='overflow-x-auto']");
    expect(scrollable).not.toBeNull();
  });

  it("TerminalSection chart header stacks vertically on mobile", async () => {
    const { default: TerminalSection } = await import("@/components/sections/TerminalSection");
    const { container } = render(<TerminalSection />);

    // The chart header should have flex-col for mobile stacking
    const header = container.querySelector("[class*='flex-col'][class*='sm\\:flex-row']");
    expect(header).not.toBeNull();
  });

  it("PlatformSection strategy builder has overflow-x-auto for node graph scroll", async () => {
    const { default: PlatformSection } = await import("@/components/sections/PlatformSection");
    const { container } = render(<PlatformSection />);

    const scrollable = container.querySelector("[class*='overflow-x-auto']");
    expect(scrollable).not.toBeNull();
  });
});
