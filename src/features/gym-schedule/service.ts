import { Prisma } from "@prisma/client";
import {
  getMoscowDateKey,
  getMoscowDateTimeParts,
  getMoscowWeekRange,
} from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const ACTIVE_BOOKING_STATUSES = ["pending", "completed", "no_show"] as const;
const MISSING_GYM_SCHEDULE_SCHEMA_ERROR_CODES = new Set(["P2021", "P2022"]);

export const FREE_SLOT_TITLE = "Свободная тренировка";
export const FREE_SLOT_DURATION_MINUTES = 60;
export const FREE_SLOT_CAPACITY = 8;
export const FREE_SLOT_HORIZON_WEEKS_AHEAD = 1;

export type GymWorkingHourInput = {
  weekday: number;
  isOpen: boolean;
  opensAtMinutes: number;
  closesAtMinutes: number;
};

export type GymScheduleSettingsInput = {
  freeSlotCapacity: number;
  freeSlotDurationMinutes: number;
  freeSlotDropInPrice: number;
  workingHours: GymWorkingHourInput[];
};

export type FreeSlotCandidate = {
  autoSlotKey: string;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
};

type SessionForOverlap = {
  id: string;
  origin: "manual" | "auto_free";
  autoSlotKey: string | null;
  startsAt: Date;
  durationMinutes: number;
  status: "scheduled" | "cancelled" | "completed";
  title: string | null;
  capacity: number;
  description: string | null;
  trainerId: string | null;
  cancellationDeadlineHours: number;
  dropInEnabled: boolean;
  dropInPrice: Prisma.Decimal | null;
};

type FreeSlotExisting = SessionForOverlap & {
  bookings: Array<{ id: string }>;
};

export type GymScheduleClient = Pick<
  Prisma.TransactionClient,
  "gymSettings" | "gymWorkingHour" | "session"
>;

function sortWorkingHours(workingHours: GymWorkingHourInput[]) {
  return [...workingHours].sort((a, b) => a.weekday - b.weekday);
}

function getDefaultWorkingHours(): GymWorkingHourInput[] {
  return Array.from({ length: 7 }, (_, index) => ({
    weekday: index + 1,
    isOpen: false,
    opensAtMinutes: 9 * 60,
    closesAtMinutes: 21 * 60,
  }));
}

function getDefaultScheduleSettings() {
  return {
    id: 1,
    freeSlotCapacity: FREE_SLOT_CAPACITY,
    freeSlotDurationMinutes: FREE_SLOT_DURATION_MINUTES,
    freeSlotDropInPrice: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function isMissingGymScheduleSchemaError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return MISSING_GYM_SCHEDULE_SCHEMA_ERROR_CODES.has(
      (error as { code: string }).code,
    );
  }

  return false;
}

async function getGymScheduleSettingsLegacy(
  db: Pick<typeof prisma, "gymSettings" | "gymWorkingHour">,
) {
  const [legacySettings, workingHours] = await Promise.all([
    db.gymSettings.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        freeSlotCapacity: true,
        freeSlotDurationMinutes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.gymWorkingHour.findMany({
      orderBy: { weekday: "asc" },
    }),
  ]);

  return {
    settings: legacySettings
      ? {
          ...legacySettings,
          freeSlotDropInPrice: 0,
        }
      : getDefaultScheduleSettings(),
    workingHours: workingHours.length ? workingHours : getDefaultWorkingHours(),
  };
}

function minutesToClockPart(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}${String(mins).padStart(2, "0")}`;
}

export function buildAutoSlotKey(startsAt: Date) {
  const parts = getMoscowDateTimeParts(startsAt);
  const slotMinutes = parts.hour * 60 + parts.minute;

  return `free:${getMoscowDateKey(startsAt)}:${minutesToClockPart(slotMinutes)}`;
}

function overlaps(start: Date, durationMinutes: number, session: SessionForOverlap) {
  const end = start.getTime() + durationMinutes * MINUTE_MS;
  const sessionStart = session.startsAt.getTime();
  const sessionEnd = sessionStart + session.durationMinutes * MINUTE_MS;

  return start.getTime() < sessionEnd && end > sessionStart;
}

export function buildFreeSlotCandidates({
  freeSlotCapacity,
  freeSlotDurationMinutes,
  workingHours,
  now = new Date(),
}: GymScheduleSettingsInput & { now?: Date }): FreeSlotCandidate[] {
  const weekRange = getMoscowWeekRange(0, now);
  const horizonEnd = new Date(
    weekRange.start.getTime() + (FREE_SLOT_HORIZON_WEEKS_AHEAD + 1) * 7 * DAY_MS,
  );
  const hoursByWeekday = new Map(
    sortWorkingHours(workingHours).map((item) => [item.weekday, item]),
  );
  const candidates: FreeSlotCandidate[] = [];

  for (
    let dayStart = weekRange.start.getTime();
    dayStart < horizonEnd.getTime();
    dayStart += DAY_MS
  ) {
    const date = new Date(dayStart);
    const parts = getMoscowDateTimeParts(date);
    const weekday = ((new Date(dayStart + 12 * 60 * MINUTE_MS).getUTCDay() + 6) % 7) + 1;
    const dayConfig = hoursByWeekday.get(weekday);

    if (!dayConfig?.isOpen) {
      continue;
    }

    for (
      let slotStartMinutes = dayConfig.opensAtMinutes;
      slotStartMinutes + freeSlotDurationMinutes <= dayConfig.closesAtMinutes;
      slotStartMinutes += freeSlotDurationMinutes
    ) {
      const startsAt = new Date(
        Date.UTC(parts.year, parts.month - 1, parts.day, 0, slotStartMinutes) -
          3 * 60 * MINUTE_MS,
      );

      if (startsAt.getTime() < now.getTime()) {
        continue;
      }

      candidates.push({
        autoSlotKey: buildAutoSlotKey(startsAt),
        startsAt,
        durationMinutes: freeSlotDurationMinutes,
        capacity: freeSlotCapacity,
      });
    }
  }

  return candidates;
}

export async function getGymScheduleSettings(db = prisma) {
  return withPrismaReadRetry(
    async () => {
      let settings: {
        id: number;
        freeSlotCapacity: number;
        freeSlotDurationMinutes: number;
        freeSlotDropInPrice: Prisma.Decimal;
        createdAt: Date;
        updatedAt: Date;
      } | null = null;
      let workingHours: GymWorkingHourInput[] = [];

      try {
        [settings, workingHours] = await Promise.all([
          db.gymSettings.findUnique({
            where: { id: 1 },
            select: {
              id: true,
              freeSlotCapacity: true,
              freeSlotDurationMinutes: true,
              freeSlotDropInPrice: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          db.gymWorkingHour.findMany({
            orderBy: { weekday: "asc" },
          }),
        ]);
      } catch (error) {
        if (!isMissingGymScheduleSchemaError(error)) {
          throw error;
        }

        // Graceful fallback for environments where latest migrations
        // have not been applied yet (e.g. missing GymSettings columns).
        try {
          return await getGymScheduleSettingsLegacy(db);
        } catch {
          return {
            settings: getDefaultScheduleSettings(),
            workingHours: getDefaultWorkingHours(),
          };
        }
      }

      return {
        settings: settings
          ? {
              ...settings,
              freeSlotDropInPrice: Number(settings.freeSlotDropInPrice),
            }
          : getDefaultScheduleSettings(),
        workingHours: workingHours.length ? workingHours : getDefaultWorkingHours(),
      };
    },
    1,
    "gymSchedule.getGymScheduleSettings",
  );
}

export async function saveGymScheduleSettingsWithDb(
  db: GymScheduleClient,
  input: GymScheduleSettingsInput,
  now = new Date(),
) {
  await db.gymSettings.upsert({
    where: { id: 1 },
    update: {
      freeSlotCapacity: input.freeSlotCapacity,
      freeSlotDurationMinutes: input.freeSlotDurationMinutes,
      freeSlotDropInPrice: input.freeSlotDropInPrice,
    },
    create: {
      id: 1,
      freeSlotCapacity: input.freeSlotCapacity,
      freeSlotDurationMinutes: input.freeSlotDurationMinutes,
      freeSlotDropInPrice: input.freeSlotDropInPrice,
    },
  });

  for (const item of sortWorkingHours(input.workingHours)) {
    await db.gymWorkingHour.upsert({
      where: { weekday: item.weekday },
      update: {
        isOpen: item.isOpen,
        opensAtMinutes: item.opensAtMinutes,
        closesAtMinutes: item.closesAtMinutes,
      },
      create: {
        weekday: item.weekday,
        isOpen: item.isOpen,
        opensAtMinutes: item.opensAtMinutes,
        closesAtMinutes: item.closesAtMinutes,
      },
    });
  }

  await reconcileFreeSlotsWithDb(db, input, now);
}

export async function reconcileFreeSlotsWithDb(
  db: GymScheduleClient,
  input?: GymScheduleSettingsInput,
  now = new Date(),
) {
  const scheduleSettings = input ?? (await getGymScheduleSettings(prisma));
  const normalizedInput =
    "settings" in scheduleSettings
      ? {
          freeSlotCapacity: scheduleSettings.settings.freeSlotCapacity,
          freeSlotDurationMinutes: scheduleSettings.settings.freeSlotDurationMinutes,
          freeSlotDropInPrice: Number(scheduleSettings.settings.freeSlotDropInPrice),
          workingHours: scheduleSettings.workingHours,
        }
      : scheduleSettings;
  const candidates = buildFreeSlotCandidates({
    ...normalizedInput,
    now,
  });
  const weekRange = getMoscowWeekRange(0, now);
  const horizonEnd = new Date(
    weekRange.start.getTime() + (FREE_SLOT_HORIZON_WEEKS_AHEAD + 1) * 7 * DAY_MS,
  );

  const freeDropInPriceNumber = normalizedInput.freeSlotDropInPrice;
  const freeDropInPriceDecimal =
    freeDropInPriceNumber > 0 ? new Prisma.Decimal(freeDropInPriceNumber) : null;

  const existingSessions = await db.session.findMany({
    where: {
      startsAt: {
        gte: now,
        lte: horizonEnd,
      },
    },
    select: {
      id: true,
      origin: true,
      autoSlotKey: true,
      startsAt: true,
      durationMinutes: true,
      status: true,
      title: true,
      capacity: true,
      description: true,
      trainerId: true,
      cancellationDeadlineHours: true,
      dropInEnabled: true,
      dropInPrice: true,
      bookings: {
        where: {
          status: {
            in: [...ACTIVE_BOOKING_STATUSES],
          },
        },
        select: {
          id: true,
        },
      },
    },
  });

  const blockingSessions = existingSessions.filter(
    (session) => session.status !== "cancelled" && session.origin !== "auto_free",
  );
  const desiredCandidates = candidates.filter(
    (candidate) =>
      !blockingSessions.some((session) =>
        overlaps(candidate.startsAt, candidate.durationMinutes, session),
      ),
  );
  const desiredKeys = new Set(
    desiredCandidates.map((candidate) => candidate.autoSlotKey),
  );
  const existingFreeSlots = existingSessions.filter(
    (session): session is FreeSlotExisting => session.origin === "auto_free",
  );
  const staleFreeSlots = existingFreeSlots.filter(
    (session) => !session.autoSlotKey || !desiredKeys.has(session.autoSlotKey),
  );
  const staleWithBookings = staleFreeSlots.filter(
    (session) => session.bookings.length > 0,
  );

  if (staleWithBookings.length) {
    throw new Error(
      "Нельзя сузить рабочее время: на будущих свободных слотах уже есть записи клиентов.",
    );
  }

  if (staleFreeSlots.length) {
    await db.session.deleteMany({
      where: {
        id: {
          in: staleFreeSlots.map((session) => session.id),
        },
      },
    });
  }

  const existingFreeSlotsByKey = new Map(
    existingFreeSlots
      .filter((session) => session.autoSlotKey)
      .map((session) => [session.autoSlotKey as string, session]),
  );

  // Оптимизация: отфильтруем только те кандидаты, которые реально нужно создать или обновить.
  // Это значительно уменьшит количество запросов к БД, особенно при каждом просмотре расписания.
  const candidatesToUpsert = desiredCandidates.filter((candidate) => {
    const existing = existingFreeSlotsByKey.get(candidate.autoSlotKey);
    if (!existing) return true;

    const activeBookingsCount = existing.bookings.length;
    const targetCapacity = activeBookingsCount
      ? Math.max(candidate.capacity, activeBookingsCount)
      : candidate.capacity;

    const existingPrice = existing.dropInPrice ?? null;
    const priceMismatch = freeDropInPriceDecimal
      ? !existingPrice || !existingPrice.equals(freeDropInPriceDecimal)
      : existingPrice !== null;

    // Проверяем, изменилось ли что-то существенное, чтобы не дергать базу лишний раз
    return (
      existing.status !== "scheduled" ||
      (activeBookingsCount === 0 && existing.durationMinutes !== candidate.durationMinutes) ||
      existing.capacity !== targetCapacity ||
      existing.title !== FREE_SLOT_TITLE ||
      existing.description !== null ||
      existing.trainerId !== null ||
      existing.cancellationDeadlineHours !== 2 ||
      existing.dropInEnabled !== true ||
      priceMismatch
    );
  });

  for (const candidate of candidatesToUpsert) {
    const existing = existingFreeSlotsByKey.get(candidate.autoSlotKey);
    const activeBookingsCount = existing?.bookings.length ?? 0;

    await db.session.upsert({
      where: {
        autoSlotKey: candidate.autoSlotKey,
      },
      update: {
        title: FREE_SLOT_TITLE,
        description: null,
        trainerId: null,
        status: "scheduled",
        durationMinutes: activeBookingsCount ? undefined : candidate.durationMinutes,
        capacity: activeBookingsCount
          ? Math.max(candidate.capacity, activeBookingsCount)
          : candidate.capacity,
        cancellationDeadlineHours: 2,
        // Клиент без абонемента должен иметь возможность записаться на свободную
        // тренировку по разовой цене из GymSettings. Держим dropInEnabled=true и
        // синхронизируем dropInPrice, чтобы UI показал кнопку разовой записи, а
        // bookSessionForUser пошёл по drop-in-ветке при отсутствии абонемента.
        dropInEnabled: true,
        dropInPrice: freeDropInPriceDecimal,
      },
      create: {
        type: "group",
        origin: "auto_free",
        autoSlotKey: candidate.autoSlotKey,
        title: FREE_SLOT_TITLE,
        startsAt: candidate.startsAt,
        durationMinutes: candidate.durationMinutes,
        capacity: candidate.capacity,
        cancellationDeadlineHours: 2,
        dropInEnabled: true,
        dropInPrice: freeDropInPriceDecimal,
      },
    });
  }
}

export async function reconcileFreeSlots(now = new Date()) {
  await reconcileFreeSlotsWithDb(prisma, undefined, now);
}
