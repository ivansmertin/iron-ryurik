import { PageHeader } from "@/components/admin/page-header";
import { BookingQrScanner } from "@/features/bookings/components/booking-qr-scanner";

export default function TrainerScanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Сканер QR"
        description="Подтверждение посещений клиентов в зале."
      />

      <BookingQrScanner />
    </div>
  );
}
