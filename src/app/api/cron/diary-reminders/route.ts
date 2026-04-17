import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { sendNotificationToDevice } from "@/lib/webpush";

const BATCH_SIZE = 50;

function isAuthorized(request: Request) {
  const header = request.headers.get("authorization");

  return Boolean(env.CRON_SECRET && header === `Bearer ${env.CRON_SECRET}`);
}

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const logs = await prisma.workoutLog.findMany({
    where: {
      sessionId: {
        not: null,
      },
      diaryReminderSentAt: null,
      performedAt: {
        lte: now,
      },
      OR: [
        {
          notes: null,
        },
        {
          notes: "",
        },
      ],
    },
    orderBy: {
      performedAt: "asc",
    },
    take: BATCH_SIZE,
    select: {
      id: true,
      userId: true,
      performedAt: true,
      durationMin: true,
      session: {
        select: {
          title: true,
        },
      },
      user: {
        select: {
          subscriptions: {
            select: {
              id: true,
              endpoint: true,
              p256dh: true,
              auth: true,
            },
          },
        },
      },
    },
  });

  let sent = 0;
  let marked = 0;
  let removedSubscriptions = 0;

  for (const log of logs) {
    const duration = log.durationMin ?? 0;
    const endedAt = new Date(log.performedAt.getTime() + duration * 60 * 1000);

    if (endedAt > now) {
      continue;
    }

    for (const subscription of log.user.subscriptions) {
      const result = await sendNotificationToDevice(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        {
          title: "Добавьте заметки о тренировке",
          body: log.session?.title ?? "Запишите впечатления и нагрузку в дневник.",
          data: {
            url: `/client/diary/${log.id}`,
          },
        },
      );

      if (result.success) {
        sent += 1;
      }

      if (result.error === "GONE") {
        await prisma.deviceSubscription.delete({
          where: {
            id: subscription.id,
          },
        });
        removedSubscriptions += 1;
      }
    }

    await prisma.workoutLog.update({
      where: {
        id: log.id,
      },
      data: {
        diaryReminderSentAt: now,
      },
    });
    marked += 1;
  }

  return NextResponse.json({
    ok: true,
    sent,
    marked,
    removedSubscriptions,
  });
}
