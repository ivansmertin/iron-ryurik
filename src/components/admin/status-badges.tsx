import type {
  BookingStatus,
  MembershipStatus,
  SessionStatus,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  bookingStatusLabels,
  dropInStatusLabels,
  membershipStatusLabels,
  sessionStatusLabels,
} from "@/lib/formatters";

function getSessionVariant(status: SessionStatus) {
  switch (status) {
    case "cancelled":
      return "destructive" as const;
    case "completed":
      return "secondary" as const;
    case "scheduled":
    default:
      return "default" as const;
  }
}

function getMembershipVariant(status: MembershipStatus) {
  switch (status) {
    case "cancelled":
      return "destructive" as const;
    case "expired":
      return "outline" as const;
    case "frozen":
      return "secondary" as const;
    case "active":
    default:
      return "default" as const;
  }
}

function getBookingVariant(status: BookingStatus) {
  switch (status) {
    case "cancelled":
      return "destructive" as const;
    case "completed":
      return "secondary" as const;
    case "no_show":
      return "outline" as const;
    case "pending":
    default:
      return "default" as const;
  }
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return <Badge variant={getSessionVariant(status)}>{sessionStatusLabels[status]}</Badge>;
}

export function MembershipStatusBadge({
  status,
}: {
  status: MembershipStatus;
}) {
  return (
    <Badge variant={getMembershipVariant(status)}>
      {membershipStatusLabels[status]}
    </Badge>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={getBookingVariant(status)}>{bookingStatusLabels[status]}</Badge>;
}

export function DropInStatusBadge({ status }: { status: string }) {
  const getDropInVariant = (s: string) => {
    switch (s) {
      case "paid":
        return "default" as const;
      case "pending":
        return "secondary" as const;
      case "cancelled":
        return "destructive" as const;
      case "refunded":
      default:
        return "outline" as const;
    }
  };

  return (
    <Badge variant={getDropInVariant(status)}>
      {dropInStatusLabels[status] || status}
    </Badge>
  );
}

export function BooleanBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return <Badge variant={value ? "default" : "outline"}>{value ? trueLabel : falseLabel}</Badge>;
}
