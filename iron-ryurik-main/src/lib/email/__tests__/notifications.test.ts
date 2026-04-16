import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email/index", () => ({
  sendEmail: sendEmailMock,
}));

import {
  sendBookingCancellationEmail,
  sendBookingConfirmationEmail,
  sendSessionCancellationEmail,
} from "@/lib/email/notifications";

describe("email notifications", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
  });

  it("формирует письмо о подтверждении записи", async () => {
    await sendBookingConfirmationEmail({
      to: "client@example.com",
      fullName: "Иван Иванов",
      sessionTitle: "Интервалы",
      startsAt: new Date("2026-04-15T15:30:00.000Z"),
      durationMinutes: 60,
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "client@example.com",
        subject: "Запись подтверждена: Интервалы",
      }),
    );

    const [payload] = sendEmailMock.mock.calls[0];
    expect(payload.html).toContain("Иван Иванов");
    expect(payload.html).toContain("15 апреля");
    expect(payload.html).toContain("18:30");
  });

  it("формирует письмо об отмене записи с возвратом визита", async () => {
    await sendBookingCancellationEmail({
      to: "client@example.com",
      fullName: "Иван Иванов",
      sessionTitle: "Интервалы",
      startsAt: new Date("2026-04-15T15:30:00.000Z"),
      durationMinutes: 60,
      membershipRestored: true,
    });

    const [payload] = sendEmailMock.mock.calls[0];
    expect(payload.subject).toBe("Запись отменена: Интервалы");
    expect(payload.html).toContain("Один визит возвращён на абонемент.");
  });

  it("формирует письмо об отмене занятия админом", async () => {
    await sendSessionCancellationEmail({
      to: "client@example.com",
      fullName: "Иван Иванов",
      sessionTitle: "ОФП",
      startsAt: new Date("2026-04-15T15:30:00.000Z"),
      durationMinutes: 75,
    });

    const [payload] = sendEmailMock.mock.calls[0];
    expect(payload.subject).toBe("Занятие отменено: ОФП");
    expect(payload.html).toContain("Визит возвращён на абонемент автоматически.");
  });
});
