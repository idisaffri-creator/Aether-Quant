import { describe, it, expect, beforeEach, vi } from "vitest";
import { passwordStrength } from "../lib/passwordStrength";

describe("passwordStrength", () => {
  it("returns Empty for empty string", () => {
    expect(passwordStrength("").label).toBe("Empty");
    expect(passwordStrength("").score).toBe(0);
  });

  it("rates short password as Weak", () => {
    const r = passwordStrength("abc");
    expect(r.label).toBe("Weak");
    expect(r.score).toBeGreaterThanOrEqual(1);
  });

  it("rates 8-char all-lowercase as Weak", () => {
    const r = passwordStrength("abcdefgh");
    expect(r.label).toBe("Weak");
  });

  it("rates 8-char mixed + number as Good", () => {
    const r = passwordStrength("Abcdefg1");
    expect(["Good", "Strong"]).toContain(r.label);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("rates very long complex password as Strong", () => {
    const r = passwordStrength("ThisIsAReallyLongSecureP@ss123!");
    expect(r.label).toBe("Strong");
    expect(r.score).toBe(4);
  });
});
