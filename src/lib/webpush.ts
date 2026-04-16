import webpush from "web-push";

// Инициализация web-push ключами из окружения.
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("web-push: VAPID ключи не сконфигурированы. Push уведомления не будут работать.");
}

type PushPayload = {
  title: string;
  body: string;
  data?: { url?: string };
};

/**
 * Отправляет Push-уведомление конкретному устройству.
 */
export async function sendNotificationToDevice(subscription: webpush.PushSubscription, payload: PushPayload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error: any) {
    console.error("Error sending push notification", error);
    if (error.statusCode === 410) {
      // 410 Gone означает, что подписка больше не валидна (пользователь отозвал права)
      return { success: false, error: "GONE" };
    }
    return { success: false, error: error.message };
  }
}
