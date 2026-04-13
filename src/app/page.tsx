import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Железный Рюрик</CardTitle>
          <CardDescription className="text-lg">
            Скоро здесь будет приложение зала
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Система управления тренировками и абонементами
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
