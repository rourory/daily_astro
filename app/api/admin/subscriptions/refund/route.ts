import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { PaymentStatus, SubscriptionStatus } from "@/lib/types/enums"

export async function POST(request: Request) {
  try {
    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 })
    }

    // Get last successful payment
    const payment = await prisma.payment.findFirst({
      where: {
        subscriptionId,
        status: PaymentStatus.succeeded,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!payment) {
      return NextResponse.json({ error: "No payment to refund" }, { status: 400 })
    }

    // TODO: Call bePaid refund API here
    // For now, just mark as refunded locally

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.refunded },
    })

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.canceled },
    })

    return NextResponse.json({
      success: true,
      refundedAmount: payment.amountByn / 100,
    })
  } catch (error) {
    console.error("Refund error:", error)
    return NextResponse.json({ error: "Failed to refund" }, { status: 500 })
  }
}
