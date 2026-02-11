import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { SubscriptionStatus } from "@/lib/types/enums"

export async function POST(request: Request) {
  try {
    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 })
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.canceled },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cancel subscription error:", error)
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 })
  }
}
