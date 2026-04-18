import { NextResponse } from "next/server";
import { reconcileFreeSlots } from "@/features/gym-schedule/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  // Проверка секрета для защиты от лишних вызовов
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    await reconcileFreeSlots(now);
    
    return NextResponse.json({ 
      ok: true, 
      message: "Free slots reconciled successfully",
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error("[api/cron/reconcile-slots] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Internal Server Error" 
    }, { status: 500 });
  }
}
