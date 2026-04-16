"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RefreshCw, Settings2 } from "lucide-react";
import { changeOccupancyAction, setExactOccupancyAction } from "../actions";

export function AdminOccupancyCard({ initialOccupancy }: { initialOccupancy: number }) {
  const [isPending, startTransition] = useTransition();
  const [occupancy, setOccupancy] = useState(initialOccupancy);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(initialOccupancy));

  const handleIncrement = () => {
    startTransition(async () => {
      const result = await changeOccupancyAction(1);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setOccupancy(result.value);
        setEditValue(String(result.value));
        toast.success("Количество людей обновлено");
      }
    });
  };

  const handleDecrement = () => {
    if (occupancy <= 0) return;
    startTransition(async () => {
      const result = await changeOccupancyAction(-1);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setOccupancy(result.value);
        setEditValue(String(result.value));
        toast.success("Количество людей обновлено");
      }
    });
  };

  const handleSaveExact = () => {
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val < 0) {
      toast.error("Неверное значение");
      return;
    }
    startTransition(async () => {
      const result = await setExactOccupancyAction(val);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setOccupancy(result.value);
        setEditValue(String(result.value));
        toast.success("Новое значение сохранено");
        setIsEditing(false);
      }
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center justify-between">
          <span>Людей в зале</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => {
              setIsEditing(!isEditing);
              setEditValue(String(occupancy));
            }}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </CardDescription>
        <CardTitle className="flex items-center text-3xl font-semibold tracking-tight">
          {occupancy}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2 mt-4">
            <input 
              type="number" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              min={0}
            />
            <Button size="sm" onClick={handleSaveExact} disabled={isPending}>
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Сохранить"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-4">
             Автоматически обновляется через турникет.
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-2">
         <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleDecrement}
              disabled={isPending || occupancy <= 0}
            >
              <Minus className="mr-2 h-4 w-4" />
              -1 
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleIncrement}
              disabled={isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
               +1
            </Button>
         </div>
      </CardFooter>
    </Card>
  );
}
