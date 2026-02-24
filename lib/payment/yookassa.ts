import { v4 as uuidv4 } from "uuid";

export interface YookassaPaymentMetadata {
  email?: string;
  subscriptionId?: string;
  isRecurring?: string;
  recurringPeriod?: string;
}
export interface YookassaPayment {
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: "redirect" | "embedded";
    return_url: string;
  };
  capture: boolean;
  description: string;
  save_payment_method?: boolean;
  metadata?: YookassaPaymentMetadata;
  test?: boolean;
}

export interface YookassaPaymentResponse {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: string;
    confirmation_url: string;
    confirmation_token?: string;
  };
  created_at: string;
  description: string;
  payment_method?: {
    id: string;
    saved: boolean;
    type: string;
  };
  metadata?: YookassaPaymentMetadata;
}

export async function createYookassaPayment(
  amount: number,
  description: string,
  metadata?: YookassaPaymentMetadata,
  confirmationType: "redirect" | "embedded" = "embedded",
): Promise<YookassaPaymentResponse> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error("Yookassa credentials not configured");
  }

  const idempotenceKey = uuidv4();
  const returnUrl = `${
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  }/checkout/success${
    metadata?.subscriptionId ? `?subscriptionId=${metadata.subscriptionId}` : ""
  }`;

  const payment: YookassaPayment = {
    amount: {
      value: amount.toFixed(2),
      currency: "RUB",
    },
    confirmation: {
      type: confirmationType,
      return_url: returnUrl,
    },
    capture: true,
    description,
    metadata,
    test:
      process.env.NODE_ENV === "development" ||
      process.env.TEST_PAYMENT == "true",
    save_payment_method: true,
  };

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
      Authorization:
        "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
    },
    body: JSON.stringify(payment),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[v0] Yookassa API error:", error);
    throw new Error(
      `Failed to create payment: ${error.description || response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Создание автоплатежа (рекуррентного списания) с использованием
 * сохранённого payment_method_id. Не требует подтверждения от пользователя.
 * Согласно API ЮKassa: POST /v3/payments с payment_method_id вместо confirmation.
 */
export async function createAutoPayment(
  amount: number,
  paymentMethodId: string,
  description: string,
  metadata?: Record<string, string>,
): Promise<YookassaPaymentResponse> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error("Yookassa credentials not configured");
  }

  const idempotenceKey = uuidv4();

  const body = {
    amount: {
      value: amount.toFixed(2),
      currency: "RUB",
    },
    capture: true,
    payment_method_id: paymentMethodId,
    description,
    metadata,
  };

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
      Authorization:
        "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[YooKassa] Auto-payment error:", error);
    throw new Error(
      `Failed to create auto-payment: ${error.description || response.statusText}`,
    );
  }

  return response.json();
}

export async function getYookassaPayment(
  paymentId: string,
): Promise<YookassaPaymentResponse> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error("Yookassa credentials not configured");
  }

  const response = await fetch(
    `https://api.yookassa.ru/v3/payments/${paymentId}`,
    {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to get payment status");
  }

  return response.json();
}

// Метод для привящзки карты. На счету должен быть рубль
export async function createYookassaSetupPayment(
  description: string,
  metadata?: YookassaPaymentMetadata,
  confirmationType: "redirect" | "embedded" = "embedded",
): Promise<YookassaPaymentResponse> {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error("Yookassa credentials not configured");
  }

  const idempotenceKey = uuidv4();

  const returnUrl = `${
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  }/checkout/success${
    metadata?.subscriptionId ? `?subscriptionId=${metadata.subscriptionId}` : ""
  }`;

  // 👇 ВАЖНО
  const payment = {
    amount: {
      value: "1.00", // минимальная сумма
      currency: "RUB",
    },
    confirmation: {
      type: confirmationType,
      return_url: returnUrl,
    },
    capture: false, // НЕ списываем деньги
    description,
    save_payment_method: true, // сохраняем карту
    metadata,
    test:
      process.env.NODE_ENV === "development" ||
      process.env.TEST_PAYMENT == "true",
  };

  const response = await fetch("https://api.yookassa.ru/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotence-Key": idempotenceKey,
      Authorization:
        "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
    },
    body: JSON.stringify(payment),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[YooKassa] Setup payment error:", error);
    throw new Error(
      `Failed to create setup payment: ${
        error.description || response.statusText
      }`,
    );
  }

  return response.json();
}

//Метод дял отметы платежа (например, если пользователь передумал и закрыл виджет)
export async function cancelYookassaPayment(paymentId: string) {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  const response = await fetch(
    `https://api.yookassa.ru/v3/payments/${paymentId}/cancel`,
    {
      method: "POST",
      headers: {
        "Idempotence-Key": uuidv4(),
        Authorization:
          "Basic " + Buffer.from(`${shopId}:${secretKey}`).toString("base64"),
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    console.error("[YooKassa] Cancel error:", error);
    throw new Error("Failed to cancel payment");
  }

  return response.json();
}
