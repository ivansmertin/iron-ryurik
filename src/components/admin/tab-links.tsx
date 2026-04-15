import Link from "next/link";
import { Button } from "@/components/ui/button";

type TabLink = {
  href: string;
  label: string;
  isActive: boolean;
};

export function TabLinks({ items }: { items: TabLink[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <Button
          key={item.href}
          variant={item.isActive ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-full px-4"
          nativeButton={false}
          render={<Link href={item.href} />}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
