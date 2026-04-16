import Link from "next/link";
import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
};

function buildPageHref(
  pathname: string,
  page: number,
  searchParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (!value || key === "page") {
      continue;
    }

    params.set(key, value);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function PaginationControls({
  page,
  totalPages,
  pathname,
  searchParams,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Страница {page} из {totalPages}
      </p>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          disabled={page <= 1}
          nativeButton={false}
          render={
            <Link href={buildPageHref(pathname, Math.max(page - 1, 1), searchParams)} />
          }
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          disabled={page >= totalPages}
          nativeButton={false}
          render={
            <Link
              href={buildPageHref(
                pathname,
                Math.min(page + 1, totalPages),
                searchParams,
              )}
            />
          }
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}
