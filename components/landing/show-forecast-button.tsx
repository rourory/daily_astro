import { Settings, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "@/lib/navigation";

interface ShowForecastButtonProps {
  className?: string;
}

const ShowForecastButton: React.FC<ShowForecastButtonProps> = ({
  className,
}) => {
  const router = useRouter();

  return (
    <div className={cn("flex w-full items-stretch gap-2", className)}>
      {/* Кнопка Прогноза (Занимает все место) */}
      <Button
        onClick={() => router.push(`/forecast`)} // Добавили локаль для надежности
        size="lg"
        variant="ghost"
        className="flex-1 cursor-pointer text-base py-6 glass hover:bg-white/10 hover:text-white rounded-2xl transition-all flex items-center justify-center gap-2"
      >
        <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300/20" />
        <span>Посмотреть прогноз</span>
      </Button>

      {/* Кнопка Настроек (Квадратная) */}
      <Button
        onClick={() => router.push(`/settings`)}
        size="lg"
        variant="ghost"
        className="cursor-pointer aspect-square h-auto p-0 glass hover:bg-white/10 hover:text-white rounded-2xl transition-all flex items-center justify-center"
        aria-label="Настройки"
      >
        <Settings className="w-6 h-6 text-muted-foreground hover:text-white transition-colors" />
      </Button>
    </div>
  );
};
export default ShowForecastButton;
