import { describe, expect, it, vi } from "vitest";
import { cancelSessionWithDb } from "@/features/sessions/service";

describe("cancelSessionWithDb", () => {
  it("отменяет занятие и возвращает визиты по связанным абонементам", async () => {
    const db = {
      session: {
        findUnique: vi.fn().mockResolvedValue({
          id: "session-1",
          status: "scheduled",
          title: "Интервалы",
          startsAt: new Date("2026-04-15T15:30:00.000Z"),
          durationMinutes: 60,
        }),
        update: vi.fn().mockResolvedValue({ id: "session-1" }),
      },
      booking: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "booking-1",
            membershipId: "membership-1",
            user: {
              fullName: "Иван Иванов",
              email: "ivan@example.com",
            },
          },
          {
            id: "booking-2",
            membershipId: "membership-2",
            user: {
              fullName: "Пётр Петров",
              email: "petr@example.com",
            },
          },
          {
            id: "booking-3",
            membershipId: null,
            user: {
              fullName: "Анна Смирнова",
              email: "anna@example.com",
            },
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
      membership: {
        update: vi.fn().mockResolvedValue({}),
      },
      dropInPass: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const result = await cancelSessionWithDb(
      db as never,
      "session-1",
    );

    expect(result).toEqual({
      cancelledBookingsCount: 3,
      session: {
        id: "session-1",
        title: "Интервалы",
        startsAt: new Date("2026-04-15T15:30:00.000Z"),
        durationMinutes: 60,
      },
      recipients: [
        {
          fullName: "Иван Иванов",
          email: "ivan@example.com",
        },
        {
          fullName: "Пётр Петров",
          email: "petr@example.com",
        },
        {
          fullName: "Анна Смирнова",
          email: "anna@example.com",
        },
      ],
    });
    expect(db.session.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { status: "cancelled" },
    });
    expect(db.booking.updateMany).toHaveBeenCalledWith({
      where: {
        sessionId: "session-1",
        status: "pending",
      },
      data: {
        status: "cancelled",
        cancelledAt: expect.any(Date),
        cancelReason: "session_cancelled",
      },
    });
    expect(db.membership.update).not.toHaveBeenCalled();
  });
});
