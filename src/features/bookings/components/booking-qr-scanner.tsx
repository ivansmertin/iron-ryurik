"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserQRCodeReader,
  type IScannerControls,
} from "@zxing/browser";
import { Camera, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmAttendanceFromQr, type AttendanceActionState } from "../actions";

type ScannerState =
  | {
      status: "idle" | "starting" | "scanning";
      message: string;
      result: null;
    }
  | {
      status: "success";
      message: string;
      result: Extract<AttendanceActionState, { ok: true }>;
    }
  | {
      status: "error";
      message: string;
      result: null;
    };

export function BookingQrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const processingRef = useRef(false);
  const [state, setState] = useState<ScannerState>({
    status: "idle",
    message: "Нажмите старт и разрешите доступ к камере.",
    result: null,
  });

  const stopScanner = useCallback((resetProcessing = true) => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (resetProcessing) {
      processingRef.current = false;
    }
  }, []);

  const handleToken = useCallback(
    async (token: string) => {
      if (processingRef.current) {
        return;
      }

      processingRef.current = true;
      stopScanner(false);
      setState({
        status: "starting",
        message: "Проверяем QR-код...",
        result: null,
      });

      const result = await confirmAttendanceFromQr(token);

      if (!result?.ok) {
        setState({
          status: "error",
          message: result?.error ?? "Не удалось подтвердить посещение.",
          result: null,
        });
        processingRef.current = false;
        return;
      }

      setState({
        status: "success",
        message: result.alreadyProcessed
          ? "Посещение уже было подтверждено ранее."
          : "Посещение подтверждено, занятие списано.",
        result,
      });
      processingRef.current = false;
    },
    [stopScanner],
  );

  const startScanner = useCallback(async () => {
    if (!videoRef.current) {
      return;
    }

    stopScanner();
    setState({
      status: "starting",
      message: "Запускаем камеру...",
      result: null,
    });

    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
          audio: false,
        },
        videoRef.current,
        (scanResult) => {
          const text = scanResult?.getText();

          if (text) {
            void handleToken(text);
          }
        },
      );

      setState({
        status: "scanning",
        message: "Наведите камеру на QR-код клиента.",
        result: null,
      });
    } catch {
      setState({
        status: "error",
        message: "Не удалось запустить камеру. Проверьте разрешения браузера.",
        result: null,
      });
    }
  }, [handleToken, stopScanner]);

  useEffect(() => stopScanner, [stopScanner]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="overflow-hidden rounded-lg border border-border/70 bg-black">
        <video
          ref={videoRef}
          className="aspect-[4/3] w-full object-cover"
          muted
          playsInline
        />
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border/70 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {state.status === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : state.status === "error" ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Camera className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="font-medium">Статус сканера</p>
          </div>
          <p className="text-muted-foreground text-sm">{state.message}</p>
        </div>

        {state.result ? (
          <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">{state.result.clientFullName}</p>
            <p>{state.result.sessionTitle ?? "Занятие без названия"}</p>
            {state.result.visitsRemaining === null ? null : (
              <p className="text-muted-foreground">
                Осталось занятий: {state.result.visitsRemaining}
              </p>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={startScanner}
            disabled={state.status === "starting" || state.status === "scanning"}
          >
            <Camera className="h-4 w-4" />
            Старт
          </Button>
          <Button type="button" variant="outline" onClick={startScanner}>
            <RotateCcw className="h-4 w-4" />
            Сканировать снова
          </Button>
        </div>
      </div>
    </div>
  );
}
