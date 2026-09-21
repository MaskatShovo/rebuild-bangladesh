import { describe, it, expect } from "vitest";
import {
  coverage,
  normalizePhone,
  normalize,
  listingSchema,
} from "../src/lib/validation";
import { messageFor } from "../src/lib/errors";
describe("material calculations and validation", () => {
  it("rounds tile boxes upward with sale increments and explicit wastage", () => {
    expect(coverage(600, 600, 4, 10, 10, 2)).toEqual({
      squareMetresPerBox: 1.44,
      boxes: 8,
    });
  });
  it("does not invent missing coverage", () => {
    expect(coverage(null, 600, 4, 10, 10)).toBeNull();
    expect(coverage(600, 600, null, 10, 10)).toBeNull();
  });
  it("normalizes Bangladesh phone numbers without claiming verification", () => {
    expect(normalizePhone("01712 345678")).toBe("+8801712345678");
    expect(normalizePhone("008801712345678")).toBe("+8801712345678");
    expect(normalizePhone("+12025550123")).toBeNull();
  });
  it("retains Bangla characters and normalizes material codes", () => {
    expect(normalize("  RC-1600  টাইলস ")).toBe("rc-1600 টাইলস");
  });
  it("returns translated validation errors", () => {
    expect(messageFor("INVALID_INPUT", "bn")).toContain("চিহ্নিত");
  });
  it("rejects unstructured listing payloads and free-form categories", () => {
    expect(listingSchema.safeParse({ categoryId: "hazardous" }).success).toBe(
      false,
    );
  });
});
