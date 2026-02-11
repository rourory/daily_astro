import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const forecasts = await prisma.forecast.findMany({
      where: {
        forecastDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: { zodiacSign: true },
      distinct: ["zodiacSign"],
    })

    return NextResponse.json({
      count: forecasts.length,
      date: new Date().toISOString().split("T")[0],
    })
  } catch (error) {
    console.error("Error checking forecasts:", error)
    return NextResponse.json({ count: 0, error: "Database error" }, { status: 500 })
  }
}
