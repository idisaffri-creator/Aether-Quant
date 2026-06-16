/**
 * Audit log writer tests.
 */
import { describe, it, expect, vi } from "vitest";

const mockInsert = vi.fn();

vi.mock("../db", () => ({
  db: {
    insert: (...args: unknown[]) => ({
      values: (...v: unknown[]) => mockInsert(...v),
    }),
  },
  schema: {
    auditLog: { id: "id", userId: "userId" },
  },
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { audit } from "../services/audit";

describe("audit", () => {
  it("writes an entry without throwing", async () => {
    mockInsert.mockResolvedValueOnce(undefined);
    await audit({
      userId: "u1",
      action: "auth.login",
      ip: "1.2.3.4",
      requestId: "req-1",
    });
    expect(mockInsert).toHaveBeenCalled();
  });

  it("swallows DB errors", async () => {
    mockInsert.mockRejectedValueOnce(new Error("DB down"));
    await expect(
      audit({ userId: "u1", action: "auth.login" })
    ).resolves.not.toThrow();
  });
});
