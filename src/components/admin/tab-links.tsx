import Link from "next/link";
import { Button } from "@/components/ui/button";

type TabLink = {
  href: string;
  label: string;
  isActive: boolean;
};

export function TabLinks({ items }: { items: TabLink[] }) {
  return (
    <div
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 pr-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{
        maskImage:
          "linear-gradient(to right, black calc(100% - 2rem), transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, black calc(100% - 2rem), transparent)",
      }}
    >
      {items.map((item) => (
        <Button
          key={item.href}
          variant={item.isActive ? "default" : "outline"}
          size="sm"
          className="shrink-0 snap-start rounded-full px-4"
          nativeButton={false}
          render={<Link href={item.href} />}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
