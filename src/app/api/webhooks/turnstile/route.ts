import { NextResponse } from "next/server";
import { updateGymOccupancy } from "@/features/gym-state/service";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Basic security token to prevent unauthorized calls
    const secret = body.secret;
    const WEBOOK_SECRET = process.env.TURNSTILE_SECRET ?? "dev-secret-key";

    if (secret !== WEBOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = body.action;
    const exactValue = body.exactValue;

    if (typeof exactValue === "number") {
      await updateGymOccupancy({ exactValue });
    } else if (action === "enter") {
      await updateGymOccupancy({ delta: 1 });
    } else if (action === "exit") {
      await updateGymOccupancy({ delta: -1 });
    } else {
      return NextResponse.json(
        { error: "Invalid payload. Provide 'action' ('enter'/'exit') or 'exactValue' (number)." },
        { status: 400 }
      );
    }

    // Revalidate paths so UI updates without waiting for re-renders naturally
    revalidatePath("/admin", "layout");
    revalidatePath("/client", "layout");

    return NextResponse.json({ success: true, message: `Processed ${action}` });
  } catch (error) {
    console.error("[Webhook Error]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
