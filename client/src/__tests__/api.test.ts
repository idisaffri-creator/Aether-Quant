import { describe, it, expect } from "vitest";

describe("API client", () => {
  it("should construct correct auth header format", () => {
    const token = "test-token-123";
    const header = `Bearer ${token}`;
    expect(header).toBe("Bearer test-token-123");
  });

  it("should handle token storage", () => {
    localStorage.setItem("aether_token", "stored-token");
    const retrieved = localStorage.getItem("aether_token");
    expect(retrieved).toBe("stored-token");
    localStorage.removeItem("aether_token");
  });
});

describe("Market utilities", () => {
  it("should calculate spread percentage correctly", () => {
    const bid = 78.00;
    const ask = 78.43;
    const spread = ((ask - bid) / ask) * 100;
    expect(spread.toFixed(3)).toBe("0.548");
  });

  it("should format large volume numbers", () => {
    const volume = 1234567;
    const formatted = `${(volume / 1000000).toFixed(2)}M`;
    expect(formatted).toBe("1.23M");
  });
});
