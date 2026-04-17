import Link from "next/link";
import { AdminToastListener } from "@/components/admin/toast-listener";
import { PageHeader } from "@/components/admin/page-header";
import { TabLinks } from "@/components/admin/tab-links";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { DropInStatusBadge } from "@/components/admin/status-badges";
import { formatMoney, formatMoscowDateTime } from "@/lib/formatters";
import { getSearchParamValue } from "@/lib/search-params";
import { listDropInPasses } from "@/features/drop-ins/queries";
import { RefundDropInButton } from "@/features/drop-ins/components/refund-drop-in-button";

type DropInsAdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STAT_TABS = [
  { value: "all", label: "Все" },
  { value: "pending", label: "Ожидают" },
  { value: "paid", label: "Оплачены" },
  { value: "refunded", label: "Возвраты" },
  { value: "cancelled", label: "Отменены" },
];

export default async function DropInsAdminPage({
  searchParams,
}: DropInsAdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const toastKey = getSearchParamValue(resolvedSearchParams.toast);
  const page = Number(getSearchParamValue(resolvedSearchParams.page) || "1");
  const statusFilter = getSearchParamValue(resolvedSearchParams.status) || "all";
  
  const { items, totalPages, schemaReady } = await listDropInPasses({
    page,
    pageSize: 20,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const sectionTabs = [
    { label: "Планы", href: "/admin/memberships/plans", isActive: false },
    { label: "Разовые визиты", href: "/admin/memberships/drop-ins", isActive: true },
  ];

  const statusTabs = STAT_TABS.map((tab) => ({
    label: tab.label,
    href: `/admin/memberships/drop-ins?status=${tab.value}`,
    isActive: statusFilter === tab.value,
  }));

  if (!schemaReady) {
    return (
      <div className="space-y-6">
        <AdminToastListener toastKey={toastKey} />

        <PageHeader
          title="РћРїР»Р°С‚Р°"
          description="РЈРїСЂР°РІР»РµРЅРёРµ РїР»Р°РЅР°РјРё Р°Р±РѕРЅРµРјРµРЅС‚РѕРІ Рё СЂР°Р·РѕРІС‹РјРё РІРёР·РёС‚Р°РјРё."
        />

        <TabLinks items={sectionTabs} />

        <Card className="border-border/70 shadow-sm">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Разовые визиты временно недоступны, выполняется обновление БД.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminToastListener toastKey={toastKey} />

      <PageHeader
        title="Оплата"
        description="Управление планами абонементов и разовыми визитами."
      />

      <TabLinks items={sectionTabs} />
      
      <div className="pt-2">
        <TabLinks items={statusTabs} />
      </div>

      {/* Mobile view */}
      <div className="grid gap-3 md:hidden">
        {items.length ? (
          items.map((item) => (
            <Card key={item.id} className="border-border/70 shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.user.fullName}</p>
                    <p className="text-muted-foreground text-xs">{item.user.email}</p>
                  </div>
                  <DropInStatusBadge status={item.status} />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-primary">
                    {item.session?.title || "Walk-In / Свободный вход"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {item.session ? formatMoscowDateTime(item.session.startsAt) : "—"}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-3">
                  <p className="font-semibold">{formatMoney(item.price.toString())}</p>
                  {item.status === "paid" && (
                    <RefundDropInButton dropInPassId={item.id} userFullName={item.user.fullName} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Нет разовых визитов в этой категории.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop view */}
      <Card className="hidden border-border/70 shadow-sm md:block">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Клиент</TableHead>
                <TableHead>Занятие / Дата</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Оплачено через</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.user.fullName}</p>
                        <p className="text-muted-foreground text-xs">{item.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="truncate font-medium">
                          {item.session?.title || "Walk-In"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {item.session ? formatMoscowDateTime(item.session.startsAt) : "Свободный вход"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(item.price.toString())}
                    </TableCell>
                    <TableCell>
                      <DropInStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {item.paidBy?.fullName || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === "paid" && (
                        <RefundDropInButton dropInPassId={item.id} userFullName={item.user.fullName} />
                      )}
                      {item.status === "pending" && item.session && (
                         <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/admin/schedule/${item.session.id}`} />}>
                            К занятию
                         </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Разовых визитов не найдено.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <PaginationControls 
          totalPages={totalPages} 
          page={page} 
          pathname="/admin/memberships/drop-ins"
          searchParams={{ status: statusFilter }}
        />
      )}
    </div>
  );
}
