/**
 * Cron Worker for Forecast Generation
 *
 * Runs daily at 00:00 UTC to generate forecasts for all zodiac signs.
 * Can be triggered via Vercel Cron or external scheduler.
 */

import prisma from "@/lib/prisma"
import { generateDailyForecasts } from "./generator"
import type { GeneratedForecast } from "./types"
import { ZodiacSign } from "@/lib/types/enums"

/**
 * Main cron job: generate and store forecasts for tomorrow
 */
export async function runForecastGeneration(): Promise<{
  success: boolean
  forecastsGenerated: number
  errors: string[]
}> {
  const errors: string[] = []
  let forecastsGenerated = 0

  try {
    // Generate for tomorrow (so they're ready for morning delivery)
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)

    // Check if forecasts already exist for this date
    const existing = await prisma.forecast.count({
      where: { forecastDate: tomorrow },
    })

    if (existing > 0) {
      console.log(`Forecasts for ${tomorrow.toISOString()} already exist, skipping generation`)
      return { success: true, forecastsGenerated: 0, errors: [] }
    }

    // Generate forecasts
    console.log(`Generating forecasts for ${tomorrow.toISOString()}...`)
    const forecasts = await generateDailyForecasts(tomorrow)

    // Store in database
    for (const forecast of forecasts) {
      try {
        await storeForecast(forecast, tomorrow)
        forecastsGenerated++
      } catch (err) {
        const errorMsg = `Failed to store forecast for ${forecast.zodiacSign}: ${err}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log(`Generated ${forecastsGenerated} forecasts for ${tomorrow.toISOString()}`)

    return {
      success: errors.length === 0,
      forecastsGenerated,
      errors,
    }
  } catch (err) {
    const errorMsg = `Forecast generation failed: ${err}`
    console.error(errorMsg)
    return {
      success: false,
      forecastsGenerated,
      errors: [errorMsg, ...errors],
    }
  }
}

/**
 * Store a single forecast in the database
 */
async function storeForecast(forecast: GeneratedForecast, date: Date): Promise<void> {
  const zodiacSign = forecast.zodiacSign as ZodiacSign

  await prisma.forecast.upsert({
    where: {
      forecastDate_zodiacSign: {
        forecastDate: date,
        zodiacSign,
      },
    },
    update: {
      love: forecast.love,
      money: forecast.money,
      mood: forecast.mood,
      advice: forecast.advice,
      source: forecast.source,
    },
    create: {
      forecastDate: date,
      zodiacSign,
      love: forecast.love,
      money: forecast.money,
      mood: forecast.mood,
      advice: forecast.advice,
      source: forecast.source,
    },
  })
}

/**
 * Get forecast for a specific date and zodiac sign
 */
export async function getForecast(date: Date, zodiacSign: string): Promise<GeneratedForecast | null> {
  const sign = zodiacSign as ZodiacSign

  const result = await prisma.forecast.findUnique({
    where: {
      forecastDate_zodiacSign: {
        forecastDate: date,
        zodiacSign: sign,
      },
    },
  })

  if (!result) return null

  return {
    date: result.forecastDate.toISOString().split("T")[0],
    zodiacSign: result.zodiacSign,
    love: result.love,
    money: result.money,
    mood: result.mood,
    advice: result.advice,
    source: result.source as GeneratedForecast["source"],
  }
}

/**
 * Get all forecasts for a specific date
 */
export async function getAllForecasts(date: Date): Promise<GeneratedForecast[]> {
  const results = await prisma.forecast.findMany({
    where: { forecastDate: date },
    orderBy: { zodiacSign: "asc" },
  })

  return results.map((row) => ({
    date: row.forecastDate.toISOString().split("T")[0],
    zodiacSign: row.zodiacSign,
    love: row.love,
    money: row.money,
    mood: row.mood,
    advice: row.advice,
    source: row.source as GeneratedForecast["source"],
  }))
}
