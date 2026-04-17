-- Drop-in passes: разовая оплата посещения без абонемента.
-- Добавляет:
--   * enum DropInStatus
--   * таблицу DropInPass
--   * колонки Session.dropInPrice, Session.dropInEnabled
--   * колонку GymSettings.freeSlotDropInPrice
--   * колонку Booking.dropInId (+ unique + FK)
--   * CHECK "Booking_payment_source_chk" — ровно одно из (membershipId, dropInId) NOT NULL.
-- Обновление триггера handle_user_delete идёт отдельной миграцией,
-- т.к. функция сидит на auth.users и не прогоняется через shadow DB.

CREATE TYPE "DropInStatus" AS ENUM ('pending', 'paid', 'cancelled', 'refunded');

CREATE TABLE "DropInPass" (
  "id"           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"       UUID            NOT NULL,
  "sessionId"    UUID,
  "price"        DECIMAL(10, 2)  NOT NULL,
  "status"       "DropInStatus"  NOT NULL DEFAULT 'pending',
  "paidAt"       TIMESTAMP(3),
  "paidAmount"   DECIMAL(10, 2),
  "paidById"     UUID,
  "cancelledAt"  TIMESTAMP(3),
  "cancelReason" TEXT,
  "refundedAt"   TIMESTAMP(3),
  "refundedById" UUID,
  "createdAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)    NOT NULL
);

ALTER TABLE "DropInPass"
  ADD CONSTRAINT "DropInPass_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DropInPass"
  ADD CONSTRAINT "DropInPass_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DropInPass"
  ADD CONSTRAINT "DropInPass_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DropInPass_userId_status_idx"
  ON "DropInPass" ("userId", "status");

CREATE INDEX "DropInPass_sessionId_status_idx"
  ON "DropInPass" ("sessionId", "status");

CREATE INDEX "DropInPass_status_createdAt_idx"
  ON "DropInPass" ("status", "createdAt" DESC);

CREATE INDEX "DropInPass_paidAt_idx"
  ON "DropInPass" ("paidAt");

-- Session: разовая цена и флаг доступности разовой брони
ALTER TABLE "Session"
  ADD COLUMN "dropInPrice"   DECIMAL(10, 2),
  ADD COLUMN "dropInEnabled" BOOLEAN NOT NULL DEFAULT false;

-- GymSettings: глобальная цена разовой свободной тренировки
ALTER TABLE "GymSettings"
  ADD COLUMN "freeSlotDropInPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Booking: ссылка на drop-in pass (взаимоисключающая с membershipId)
ALTER TABLE "Booking"
  ADD COLUMN "dropInId" UUID;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_dropInId_fkey"
  FOREIGN KEY ("dropInId") REFERENCES "DropInPass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Booking_dropInId_key"
  ON "Booking" ("dropInId");

-- CHECK: ровно одно из (membershipId, dropInId) NOT NULL.
-- Если бронь отменена (status='cancelled') — допускаем оба NULL,
-- поскольку при soft-delete или отмене связка с платежом уже неактуальна.
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_payment_source_chk"
  CHECK (
    status = 'cancelled'
    OR (
      ("membershipId" IS NOT NULL)::int + ("dropInId" IS NOT NULL)::int = 1
    )
  );
