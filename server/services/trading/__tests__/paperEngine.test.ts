/**
 * Paper trading engine tests.
 */
import { describe, it, expect, vi } from "vitest";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn(() => ({
  from: () => ({
    where: () => ({ execute: () => Promise.resolve([]) }),
  }),
}));

vi.mock("../../../db", () => ({
  db: {
    insert: (...a: unknown[]) => ({ values: (...v: unknown[]) => mockInsert(...v) }),
    update: (...a: unknown[]) => ({ set: (...s: unknown[]) => ({ where: () => ({ execute: () => mockUpdate() }) }) }),
    select: (...a: unknown[]) => mockSelect(),
  },
  schema: {
    orders: {},
    positions: {},
    users: { id: "id" },
  },
  client: (() => undefined) as any,
}));

vi.mock("../../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../ws/userBroadcaster", () => ({
  broadcastToUser: vi.fn(),
}));

vi.mock("../../data/quoteCache", () => ({
  getQuotes: vi.fn(async () => [{ symbol: "WTI", price: 75.0 }]),
}));

import { orderSchema } from "../paperEngine";

describe("paperEngine order schema", () => {
  it("accepts a valid market order", () => {
    const r = orderSchema.safeParse({ symbol: "WTI", side: "buy", type: "market", quantity: 1 });
    expect(r.success).toBe(true);
  });

  it("accepts a valid limit order with limitPrice", () => {
    const r = orderSchema.safeParse({ symbol: "WTI", side: "buy", type: "limit", quantity: 1, limitPrice: 70 });
    expect(r.success).toBe(true);
  });

  it("rejects a limit order without limitPrice", () => {
    const r = orderSchema.safeParse({ symbol: "WTI", side: "buy", type: "limit", quantity: 1 });
    expect(r.success).toBe(false);
  });

  it("rejects a stop order without stopPrice", () => {
    const r = orderSchema.safeParse({ symbol: "WTI", side: "sell", type: "stop", quantity: 1 });
    expect(r.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const r = orderSchema.safeParse({ symbol: "WTI", side: "buy", type: "market", quantity: -5 });
    expect(r.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const r = orderSchema.safeParse({ symbol: "WTI", side: "buy", type: "market", quantity: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects unknown symbol", () => {
    const r = orderSchema.safeParse({ symbol: "INVALID", side: "buy", type: "market", quantity: 1 });
    expect(r.success).toBe(false);
  });
});
