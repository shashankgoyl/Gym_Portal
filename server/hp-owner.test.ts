import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { assertHpOwner } from "./hp-owner";

describe("assertHpOwner", () => {
  it("rejects an identity other than the configured HP owner", () => {
    expect(() => assertHpOwner("non-owner-test-identity")).toThrow(/private health portal/i);
  });

  it("allows the configured owner identity", () => {
    expect(ENV.ownerOpenId).not.toBe("");
    expect(() => assertHpOwner(ENV.ownerOpenId)).not.toThrow();
  });
});
