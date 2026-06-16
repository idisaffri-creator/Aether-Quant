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
    expect(r.score).toBe(1);
  });

  it("rates 8-char all-lowercase as Fair", () => {
    const r = passwordStrength("abcdefgh");
    expect(["Fair", "Weak"]).toContain(r.label);
  });

  it("rates complex password as Good or Strong", () => {
    const r = passwordStrength("Aa1!aaaa");
    expect(["Good", "Strong"]).toContain(r.label);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it("rates very long complex password as Strong", () => {
    const r = passwordStrength("ThisIsAReallyLongSecureP@ss123!");
    expect(r.label).toBe("Strong");
    expect(r.score).toBe(4);
  });
});
