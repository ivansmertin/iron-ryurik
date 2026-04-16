"use client";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Users } from "lucide-react";

export function ClientOccupancyCard({ occupancy }: { occupancy: number }) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardDescription className="text-primary-foreground/80">Сейчас в зале</CardDescription>
        <Users className="h-5 w-5 text-primary-foreground/80" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl font-bold">{occupancy}</span>
          <span className="text-sm font-medium text-primary-foreground/80">
            {occupancy === 1 ? "человек" : 
             occupancy > 1 && occupancy < 5 ? "человека" : "человек"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
