"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBookingQrToken } from "@/features/bookings/actions";
import { cn } from "@/lib/utils";

type BookingQrCodeProps = {
  bookingId: string;
  className?: string;
};

type QrState =
  | {
      status: "loading";
      token: null;
      expiresAt: null;
      error: null;
    }
  | {
      status: "ready";
      token: string;
      expiresAt: Date;
      error: null;
    }
  | {
      status: "error";
      token: null;
      expiresAt: null;
      error: string;
    };

export function BookingQRCode({ bookingId, className }: BookingQrCodeProps) {
  const [state, setState] = useState<QrState>({
    status: "loading",
    token: null,
    expiresAt: null,
    error: null,
  });
  const [isPending, startTransition] = useTransition();

  const fetchToken = useCallback(() => {
    startTransition(async () => {
      const result = await getBookingQrToken(bookingId);

      if (!result.ok) {
        setState({
          status: "error",
          token: null,
          expiresAt: null,
          error: result.error,
        });
        return;
      }

      setState({
        status: "ready",
        token: result.token,
        expiresAt: new Date(result.expiresAt),
        error: null,
      });
    });
  }, [bookingId]);

  const loadToken = useCallback(() => {
    setState((current) => ({
      status: current.status === "ready" ? "ready" : "loading",
      token: current.token,
      expiresAt: current.expiresAt,
      error: null,
    }) as QrState);

    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    const refreshInMs = Math.max(
      state.expiresAt.getTime() - Date.now() - 30_000,
      5_000,
    );
    const timeoutId = window.setTimeout(loadToken, refreshInMs);

    return () => window.clearTimeout(timeoutId);
  }, [loadToken, state]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border/70 p-4 sm:max-w-xs",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">QR для входа</p>
          <p className="text-muted-foreground text-xs">
            Покажите код администратору или тренеру в зале.
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={loadToken}
          disabled={isPending}
          title="Обновить QR-код"
        >
          <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
        </Button>
      </div>

      <div className="flex min-h-52 items-center justify-center rounded-md bg-white p-3">
        {state.status === "ready" ? (
          <QRCodeSVG value={state.token} size={192} level="M" />
        ) : state.status === "error" ? (
          <p className="text-center text-sm text-destructive">{state.error}</p>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Генерируем код...
          </p>
        )}
      </div>

      {state.status === "ready" ? (
        <p className="text-muted-foreground text-xs">
          Код обновится автоматически.
        </p>
      ) : null}
    </div>
  );
}
