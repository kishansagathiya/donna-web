import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  expectedPaymentLinkSignature,
  normalizePreorder,
} from "../../scripts/razorpay-api.mjs";

describe("normalizePreorder", () => {
  const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+91 98765 43210",
    address: "12 Church Street, Bengaluru, KA 560001, India",
  };

  it("accepts a complete reservation", () => {
    expect(normalizePreorder(valid)).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+919876543210",
      address: "12 Church Street, Bengaluru, KA 560001, India",
    });
  });

  it("rejects a missing address", () => {
    expect(normalizePreorder({ ...valid, address: "Bengaluru" }).error).toMatch(
      /address/i,
    );
  });
});

describe("Razorpay payment-link signature", () => {
  it("matches HMAC-SHA256 of id|reference|status|payment_id", () => {
    const expected = createHmac("sha256", "test_secret")
      .update("plink_1|dhw-1|paid|pay_1")
      .digest("hex");
    expect(
      expectedPaymentLinkSignature(
        "plink_1",
        "dhw-1",
        "paid",
        "pay_1",
        "test_secret",
      ),
    ).toBe(expected);
  });
});
