import { PageHeader } from "@/components/admin/page-header";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { TabLinks } from "@/components/admin/tab-links";
import { BookingStatusBadge } from "@/components/admin/status-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingQRCode } from "@/features/bookings/components/booking-qr-code";
import { CancelBookingButton } from "@/features/bookings/components/cancel-booking-button";
import { getClientBookings } from "@/features/bookings/queries";
import { requireUser } from "@/features/auth/get-user";
import { formatMoscowDateShort, formatMoscowRelativeDateTime, formatMoscowTime } from "@/lib/formatters";
import { getSearchParamValue, parsePositivePage } from "@/lib/search-params";

const PAGE_SIZE = 20;
const BOOKING_TABS = ["upcoming", "past", "cancelled"] as const;

type BookingTab = (typeof BOOKING_TABS)[number];

type BookingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getTabHref(tab: BookingTab) {
  return tab === "upcoming" ? "/client/bookings" : `/client/bookings?tab=${tab}`;
}

function getTabFromSearchParam(value: string): BookingTab {
  if (BOOKING_TABS.includes(value as BookingTab)) {
    return value as BookingTab;
  }

  return "upcoming";
}

function getBookingDateSortValue(booking: Awaited<ReturnType<typeof getClientBookings>>[number]) {
  return booking.status === "cancelled"
    ? booking.cancelledAt?.getTime() ?? booking.bookedAt.getTime()
    : booking.session.startsAt.getTime();
}

export default async function ClientBookingsPage({
  searchParams,
}: BookingsPageProps) {
  const user = await requireUser("client");
  const resolvedSearchParams = await searchParams;
  const tab = getTabFromSearchParam(getSearchParamValue(resolvedSearchParams.tab));
  const page = parsePositivePage(resolvedSearchParams.page);
  const now = new Date();
  const bookings = await getClientBookings(user.id);

  const filteredBookings = bookings
    .filter((booking) => {
      if (tab === "cancelled") {
        return booking.status === "cancelled";
      }

      if (tab === "past") {
        return (
          booking.status === "completed" ||
          booking.status === "no_show" ||
          (booking.status === "pending" &&
            booking.session.startsAt.getTime() <= now.getTime())
        );
      }

      return (
        booking.status === "pending" &&
        booking.session.startsAt.getTime() > now.getTime()
      );
    })
    .sort((a, b) => {
      if (tab === "upcoming") {
        return a.session.startsAt.getTime() - b.session.startsAt.getTime();
      }

      return getBookingDateSortValue(b) - getBookingDateSortValue(a);
    });

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredBookings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои записи"
        description="Предстоящие, прошлые и отменённые занятия."
      />

      <TabLinks
        items={BOOKING_TABS.map((item) => ({
          href: getTabHref(item),
          label:
            item === "upcoming"
              ? "Предстоящие"
              : item === "past"
                ? "Прошедшие"
                : "Отменённые",
          isActive: tab === item,
        }))}
      />

      <div className="grid gap-4">
        {pageItems.length ? (
          pageItems.map((booking) => (
            <Card key={booking.id} className="border-border/70 shadow-sm">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription>
                      {tab === "cancelled"
                        ? `Отменено ${formatMoscowDateShort(
                            booking.cancelledAt ?? booking.session.startsAt,
                          )}`
                        : formatMoscowRelativeDateTime(booking.session.startsAt, now)}
                    </CardDescription>
                    <CardTitle>{booking.session.title ?? "Без названия"}</CardTitle>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  {formatMoscowDateShort(booking.session.startsAt)} в{" "}
                  {formatMoscowTime(booking.session.startsAt)}, {booking.session.durationMinutes} мин
                </p>
                {booking.status === "cancelled" && booking.cancelReason ? (
                  <p className="text-muted-foreground text-xs">
                    Причина: {booking.cancelReason}
                  </p>
                ) : null}
                {tab === "upcoming" ? (
                  <div className="space-y-3">
                    <BookingQRCode bookingId={booking.id} />
                    <CancelBookingButton
                      bookingId={booking.id}
                      sessionTitle={booking.session.title}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>
                {tab === "upcoming"
                  ? "Нет предстоящих записей"
                  : tab === "past"
                    ? "Нет прошедших записей"
                    : "Нет отменённых записей"}
              </CardTitle>
              <CardDescription>
                {tab === "cancelled"
                  ? "Отменённые записи появятся здесь после отмены."
                  : "Здесь пока нет записей."}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        pathname="/client/bookings"
        searchParams={{
          tab: tab === "upcoming" ? undefined : tab,
        }}
      />
    </div>
  );
}
