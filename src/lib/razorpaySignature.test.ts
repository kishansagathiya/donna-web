import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { expectedSignature } from "../../scripts/razorpay-api.mjs";

describe("Razorpay signature", () => {
  it("matches HMAC-SHA256 of order_id|payment_id", () => {
    const expected = createHmac("sha256", "test_secret")
      .update("order_abc|pay_xyz")
      .digest("hex");
    expect(expectedSignature("order_abc", "pay_xyz", "test_secret")).toBe(expected);
  });
});
