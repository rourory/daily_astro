import { NextResponse } from 'next/server'
import { PushSubscription } from 'web-push'

// Описываем структуру тела запроса
interface SaveSubscriptionBody {
  subscription: PushSubscription
  userId: number | string
}

export async function POST(req: Request) {
  try {
    const body: SaveSubscriptionBody = await req.json()
    const { subscription, userId } = body
    
    // TODO: Ваша логика сохранения в БД (Prisma, Drizzle и т.д.)
    // await db.user.update({
    //   where: { id: userId },
    //   data: { pushSubscription: JSON.stringify(subscription) }
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
} 