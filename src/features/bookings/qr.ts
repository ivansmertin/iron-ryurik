import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { BookingServiceError } from "./service";

const QR_TOKEN_VERSION = 1;
const QR_TOKEN_TYPE = "booking-attendance";
export const BOOKING_QR_TOKEN_TTL_MS = 10 * 60 * 1000;

type BookingQrUnsignedPayload = {
  v: typeof QR_TOKEN_VERSION;
  type: typeof QR_TOKEN_TYPE;
  bookingId: string;
  userId: string;
  sessionId: string;
  exp: number;
  nonce: string;
};

type BookingQrPayload = BookingQrUnsignedPayload & {
  sig: string;
};

export type VerifiedBookingQrToken = Pick<
  BookingQrUnsignedPayload,
  "bookingId" | "userId" | "sessionId" | "exp"
>;

function canonicalize(payload: BookingQrUnsignedPayload) {
  return JSON.stringify({
    v: payload.v,
    type: payload.type,
    bookingId: payload.bookingId,
    userId: payload.userId,
    sessionId: payload.sessionId,
    exp: payload.exp,
    nonce: payload.nonce,
  });
}

function signPayload(payload: BookingQrUnsignedPayload) {
  return createHmac("sha256", env.QR_SIGNING_SECRET)
    .update(canonicalize(payload))
    .digest("base64url");
}

function isValidPayload(value: unknown): value is BookingQrPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    payload.v === QR_TOKEN_VERSION &&
    payload.type === QR_TOKEN_TYPE &&
    typeof payload.bookingId === "string" &&
    typeof payload.userId === "string" &&
    typeof payload.sessionId === "string" &&
    typeof payload.exp === "number" &&
    typeof payload.nonce === "string" &&
    typeof payload.sig === "string"
  );
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createBookingQrToken({
  bookingId,
  userId,
  sessionId,
  now = new Date(),
}: {
  bookingId: string;
  userId: string;
  sessionId: string;
  now?: Date;
}) {
  const unsignedPayload: BookingQrUnsignedPayload = {
    v: QR_TOKEN_VERSION,
    type: QR_TOKEN_TYPE,
    bookingId,
    userId,
    sessionId,
    exp: now.getTime() + BOOKING_QR_TOKEN_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  };

  return JSON.stringify({
    ...unsignedPayload,
    sig: signPayload(unsignedPayload),
  } satisfies BookingQrPayload);
}

export function verifyBookingQrToken(
  token: string,
  now = new Date(),
): VerifiedBookingQrToken {
  let parsed: unknown;

  try {
    parsed = JSON.parse(token);
  } catch {
    throw new BookingServiceError("INVALID_QR_TOKEN");
  }

  if (!isValidPayload(parsed)) {
    throw new BookingServiceError("INVALID_QR_TOKEN");
  }

  const { sig, ...unsignedPayload } = parsed;
  const expectedSignature = signPayload(unsignedPayload);

  if (!signaturesMatch(sig, expectedSignature)) {
    throw new BookingServiceError("INVALID_QR_TOKEN");
  }

  if (parsed.exp < now.getTime()) {
    throw new BookingServiceError("QR_TOKEN_EXPIRED");
  }

  return {
    bookingId: parsed.bookingId,
    userId: parsed.userId,
    sessionId: parsed.sessionId,
    exp: parsed.exp,
  };
}
