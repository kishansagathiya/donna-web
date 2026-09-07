const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: { error?: { description?: string; reason?: string } }) => void,
  ) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

function razorpayConstructor(): RazorpayConstructor | undefined {
  return (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
}

export function loadRazorpayScript(): Promise<void> {
  if (razorpayConstructor()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(options: {
  key: string;
  orderId: string;
  amount: number;
  currency: string;
  onSuccess: (response: RazorpaySuccessResponse) => void | Promise<void>;
  onDismiss: () => void;
  onFailed: (message: string) => void;
}): Promise<void> {
  await loadRazorpayScript();
  const Razorpay = razorpayConstructor();
  if (!Razorpay) {
    throw new Error("Razorpay checkout is unavailable");
  }

  const checkout = new Razorpay({
    key: options.key,
    amount: options.amount,
    currency: options.currency,
    name: "Donna",
    description: "Hardware reservation",
    order_id: options.orderId,
    handler: (response: RazorpaySuccessResponse) => {
      void options.onSuccess(response);
    },
    modal: {
      ondismiss: options.onDismiss,
    },
    theme: { color: "#c4a35a" },
  });

  checkout.on("payment.failed", (response) => {
    options.onFailed(
      response.error?.description || response.error?.reason || "Payment failed",
    );
  });
  checkout.open();
}
