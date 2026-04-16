import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  session: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const requireUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const cancelSessionWithDbMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/features/auth/get-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/features/sessions/service", () => ({
  cancelSessionWithDb: cancelSessionWithDbMock,
}));

import {
  cancelTrainerSlot,
  createTrainerSlot,
  updateTrainerClientNotes,
  updateTrainerSlot,
} from "@/features/trainer/actions";

describe("trainer actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "trainer-1", role: "trainer" });
    prismaMock.session.create.mockResolvedValue({ id: "slot-1" });
    prismaMock.session.findFirst.mockResolvedValue({
      id: "slot-1",
      status: "scheduled",
      startsAt: new Date("2099-01-01T06:00:00.000Z"),
    });
    prismaMock.session.update.mockResolvedValue({ id: "slot-1" });
    prismaMock.user.findFirst.mockResolvedValue({ id: "client-1" });
    prismaMock.user.update.mockResolvedValue({ id: "client-1" });
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: never) => unknown) => callback({} as never),
    );
    cancelSessionWithDbMock.mockResolvedValue({ cancelledBookingsCount: 2 });
  });

  it("создаёт личный слот тренера с фиксированной вместимостью", async () => {
    const formData = new FormData();
    formData.set("title", "");
    formData.set("description", "");
    formData.set("date", "2099-01-01");
    formData.set("startTime", "09:00");
    formData.set("durationMinutes", "60");

    await expect(createTrainerSlot(undefined, formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(prismaMock.session.create).toHaveBeenCalledWith({
      data: {
        type: "personal",
        trainerId: "trainer-1",
        title: null,
        description: null,
        startsAt: new Date("2099-01-01T06:00:00.000Z"),
        durationMinutes: 60,
        capacity: 1,
      },
    });
    expect(redirectMock).toHaveBeenCalledWith("/trainer/slots?toast=session-created");
  });

  it("обновляет только свой slot", async () => {
    const formData = new FormData();
    formData.set("title", "Персональная работа");
    formData.set("description", "Обновлённое описание");
    formData.set("date", "2099-01-01");
    formData.set("startTime", "10:30");
    formData.set("durationMinutes", "75");

    await expect(updateTrainerSlot("slot-1", undefined, formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(prismaMock.session.findFirst).toHaveBeenCalledWith({
      where: {
        id: "slot-1",
        type: "personal",
        trainerId: "trainer-1",
      },
      select: {
        id: true,
        status: true,
        startsAt: true,
      },
    });
    expect(prismaMock.session.update).toHaveBeenCalledWith({
      where: {
        id: "slot-1",
      },
      data: {
        title: "Персональная работа",
        description: "Обновлённое описание",
        startsAt: new Date("2099-01-01T07:30:00.000Z"),
        durationMinutes: 75,
        version: {
          increment: 1,
        },
      },
    });
    expect(redirectMock).toHaveBeenCalledWith("/trainer/slots?toast=session-updated");
  });

  it("не даёт редактировать чужой slot", async () => {
    prismaMock.session.findFirst.mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("title", "Персональная работа");
    formData.set("description", "");
    formData.set("date", "2099-01-01");
    formData.set("startTime", "10:30");
    formData.set("durationMinutes", "75");

    await expect(updateTrainerSlot("foreign-slot", undefined, formData)).resolves.toEqual(
      {
        ok: false,
        error: "Слот не найден.",
      },
    );

    expect(prismaMock.session.update).not.toHaveBeenCalled();
  });

  it("отменяет личный slot через общий cancel flow", async () => {
    await expect(cancelTrainerSlot("slot-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(cancelSessionWithDbMock).toHaveBeenCalledWith({}, "slot-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/trainer");
    expect(revalidatePathMock).toHaveBeenCalledWith("/trainer/slots");
    expect(revalidatePathMock).toHaveBeenCalledWith("/trainer/slots/slot-1");
    expect(redirectMock).toHaveBeenCalledWith(
      "/trainer/slots?toast=session-cancelled%3A2",
    );
  });

  it("сохраняет заметку только своему клиенту", async () => {
    const formData = new FormData();
    formData.set("notes", "Сильная аэробная база");

    await expect(updateTrainerClientNotes("client-1", undefined, formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "client-1",
        role: "client",
        deletedAt: null,
        programs: {
          some: {
            trainerId: "trainer-1",
          },
        },
      },
      select: {
        id: true,
      },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: {
        id: "client-1",
      },
      data: {
        notes: "Сильная аэробная база",
      },
    });
    expect(redirectMock).toHaveBeenCalledWith(
      "/trainer/clients/client-1/notes?toast=notes-updated",
    );
  });

  it("не даёт сохранить заметку чужому клиенту", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set("notes", "Наблюдение");

    await expect(
      updateTrainerClientNotes("foreign-client", undefined, formData),
    ).resolves.toEqual({
      ok: false,
      error: "Клиент не найден.",
    });

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
