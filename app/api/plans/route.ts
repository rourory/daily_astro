import { PlanService } from "@/lib/dal/services"
import { NextResponse } from "next/server"

// GET /api/plans - List active subscription plans
export async function GET() {
  
  const plans = await PlanService.findAll();

  return NextResponse.json({ plans })
}
