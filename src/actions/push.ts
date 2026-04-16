"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function savePushSubscription(subscriptionParam: any, userAgent: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Необходима авторизация" };
  }

  const endpoint = subscriptionParam.endpoint;
  const p256dh = subscriptionParam.keys?.p256dh;
  const auth = subscriptionParam.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return { error: "Неверный формат подписки" };
  }

  try {
    await prisma.deviceSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth, userAgent },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent },
    });
    return { success: true };
  } catch (err) {
    console.error("savePushSubscription error", err);
    return { error: "Ошибка сохранения подписки" };
  }
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Необходима авторизация" };
  }

  try {
    // Удаляем из базы только если подписка принадлежит текущему пользователю
    await prisma.deviceSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    });
    return { success: true };
  } catch (err) {
    console.error("removePushSubscription error", err);
    return { error: "Ошибка удаления подписки" };
  }
}
