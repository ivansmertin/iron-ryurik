import webpush from "web-push";
import { env } from "@/lib/env";

// Инициализация web-push ключами из окружения.
if (env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("web-push: VAPID ключи не сконфигурированы. Push уведомления не будут работать.");
}

type PushPayload = {
  title: string;
  body: string;
  data?: { url?: string };
};

function isWebPushError(error: unknown): error is Error & { statusCode?: number } {
  return error instanceof Error;
}

/**
 * Отправляет Push-уведомление конкретному устройству.
 */
export async function sendNotificationToDevice(subscription: webpush.PushSubscription, payload: PushPayload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification", error);
    if (isWebPushError(error) && error.statusCode === 410) {
      // 410 Gone означает, что подписка больше не валидна (пользователь отозвал права)
      return { success: false, error: "GONE" };
    }
    return {
      success: false,
      error: isWebPushError(error) ? error.message : "Unknown push error",
    };
  }
}
