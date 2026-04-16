"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { savePushSubscription, removePushSubscription } from "@/actions/push";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscribeToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Ошибка при проверке подписки:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeUser = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Запрашиваем разрешение, если еще не выдано
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Уведомления заблокированы в настройках браузера");
        setIsLoading(false);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("VAPID public key is not defined in env variables");
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // Отправляем на сервер
      const res = await savePushSubscription(JSON.parse(JSON.stringify(subscription)), navigator.userAgent);
      
      if (res.error) {
        toast.error(res.error);
      } else {
        setIsSubscribed(true);
        toast.success("Push уведомления успешно включены!");
      }
    } catch (error: any) {
      console.error("Failed to subscribe the user: ", error);
      toast.error("Не удалось подписаться на уведомления");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Удаляем с сервера
        await removePushSubscription(subscription.endpoint);
        // Отписываемся в браузере
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.success("Уведомления отключены");
      }
    } catch (error) {
      console.error("Failed to unsubscribe", error);
      toast.error("Ошибка при отключении");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col gap-2 p-4 border rounded-xl bg-muted/50">
        <div className="font-medium text-sm text-muted-foreground">Push уведомления не поддерживаются на этом устройстве</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-xl flex-wrap gap-4">
      <div className="flex flex-col gap-1">
        <h4 className="font-medium flex items-center gap-2">
          {isSubscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
          Уведомления о тренировках
        </h4>
        <p className="text-sm text-muted-foreground max-w-sm">
          Получайте напоминания о предстоящих занятиях и изменениях в расписании.
        </p>
      </div>

      <Button
        variant={isSubscribed ? "outline" : "default"}
        onClick={isSubscribed ? unsubscribeUser : subscribeUser}
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isSubscribed ? "Отключить" : "Включить Push"}
      </Button>
    </div>
  );
}
