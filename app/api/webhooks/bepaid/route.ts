import { type NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/bepaid"
import { SubscriptionStatus, PaymentStatus } from "@/lib/types/enums"

// Idempotency store (in production use Redis/DB)
const processedTransactions = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-bepaid-signature") || ""
    const rawBody = await request.text()

    // Verify signature (if secret is set)
    if (process.env.BEPAID_WEBHOOK_SECRET) {
      const valid = verifyWebhookSignature(rawBody, signature)
      if (!valid) {
        console.error("Invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Parse payload
    const payload = parseWebhookPayload(rawBody)
    if (!payload) {
      console.error("Invalid payload")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const { transaction } = payload
    const transactionId = transaction.uid
    const orderId = transaction.tracking_id

    // Idempotency check
    if (processedTransactions.has(transactionId)) {
      console.log(`Transaction ${transactionId} already processed`)
      return NextResponse.json({ status: "already_processed" })
    }

    console.log("Incoming bePaid webhook:", {
      orderId,
      transactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      hasToken: !!transaction.payment?.token,
    })

    switch (transaction.status) {
      case "successful":
        await handleSuccessfulPayment({
          orderId,
          transactionId,
          amount: transaction.amount,
          currency: transaction.currency,
          paymentToken: transaction.payment?.token || null,
        })
        break

      case "failed":
        await handleFailedPayment({
          orderId,
          transactionId,
          amount: transaction.amount,
        })
        break

      case "pending":
        console.log(`Payment ${orderId} is pending`)
        break

      default:
        console.log(`Unknown payment status: ${transaction.status}`)
    }

    processedTransactions.add(transactionId)
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}

async function handleSuccessfulPayment(params: {
  orderId: string
  transactionId: string
  amount: number
  currency: string
  paymentToken: string | null
}) {
  console.log(`Payment successful for order ${params.orderId}`)

  const payment = await prisma.payment.findUnique({
    where: { orderId: params.orderId },
    include: { user: true },
  })

  if (!payment) {
    console.error("Payment not found in DB")
    return
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.succeeded,
      providerPaymentId: params.transactionId,
    },
  })

  // Activate subscription
  const renewAt = new Date()
  renewAt.setDate(renewAt.getDate() + 30)

  if (payment.subscriptionId) {
    await prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: SubscriptionStatus.active,
        paymentToken: params.paymentToken,
        renewAt,
        lastPaymentId: payment.id,
      },
    })

    console.log(
      `Subscription ${payment.subscriptionId} activated until ${renewAt.toISOString()}`
    )

    // Send confirmation to user via Telegram
    const botToken = process.env.BOT_TOKEN
    if (botToken && payment.user.telegramId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: payment.user.telegramId.toString(),
          text: `Оплата прошла успешно!\n\nВаша подписка активирована до ${renewAt.toLocaleDateString("ru-RU")}.\n\nИспользуйте /forecast для получения прогноза.`,
          parse_mode: "HTML",
        }),
      })
    }
  }
}

async function handleFailedPayment(params: {
  orderId: string
  transactionId: string
  amount: number
}) {
  console.log(`Payment failed for order ${params.orderId}`)

  const payment = await prisma.payment.findUnique({
    where: { orderId: params.orderId },
    include: { user: true },
  })

  if (!payment) {
    console.error("Payment not found in DB")
    return
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.failed,
      providerPaymentId: params.transactionId,
    },
  })

  // Move subscription to grace period (3 days)
  const graceUntil = new Date()
  graceUntil.setDate(graceUntil.getDate() + 3)

  if (payment.subscriptionId) {
    await prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: SubscriptionStatus.grace,
        renewAt: graceUntil,
      },
    })

    console.log(
      `Subscription ${payment.subscriptionId} moved to grace period until ${graceUntil.toISOString()}`
    )

    // Notify user
    const botToken = process.env.BOT_TOKEN
    if (botToken && payment.user.telegramId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: payment.user.telegramId.toString(),
          text: `Оплата не прошла.\n\nВаша подписка сохранится ещё 3 дня. Пожалуйста, обновите способ оплаты.`,
          parse_mode: "HTML",
        }),
      })
    }
  }
}
