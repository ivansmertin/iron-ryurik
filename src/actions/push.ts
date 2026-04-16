"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type PushSubscriptionPayload = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type ValidPushSubscriptionPayload = {
  endpoint: PushSubscriptionPayload["endpoint"];
  keys: {
    p256dh: string;
    auth: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validatePushSubscriptionPayload(
  payload: unknown,
): ValidPushSubscriptionPayload | { error: string } {
  if (!isRecord(payload)) {
    return { error: "Неверный формат подписки: ожидается объект." };
  }

  const endpoint = payload.endpoint;
  const keys = payload.keys;

  if (typeof endpoint !== "string" || endpoint.trim() === "") {
    return { error: "Неверный формат подписки: отсутствует endpoint." };
  }

  if (!isRecord(keys)) {
    return { error: "Неверный формат подписки: отсутствуют ключи." };
  }

  const p256dh = keys.p256dh;
  const auth = keys.auth;

  if (typeof p256dh !== "string" || p256dh.trim() === "") {
    return { error: "Неверный формат подписки: отсутствует ключ p256dh." };
  }

  if (typeof auth !== "string" || auth.trim() === "") {
    return { error: "Неверный формат подписки: отсутствует ключ auth." };
  }

  return {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };
}

export async function savePushSubscription(
  subscriptionParam: unknown,
  userAgent: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Необходима авторизация" };
  }

  const parsed = validatePushSubscriptionPayload(subscriptionParam);

  if ("error" in parsed) {
    return parsed;
  }

  const endpoint = parsed.endpoint;
  const { p256dh, auth } = parsed.keys;

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

  if (!endpoint.trim()) {
    return { error: "Неверный endpoint подписки" };
  }

  try {
    await prisma.deviceSubscription.deleteMany({
      where: { endpoint, userId: user.id },
    });
    return { success: true };
  } catch (err) {
    console.error("removePushSubscription error", err);
    return { error: "Ошибка удаления подписки" };
  }
}
