
'use clinet'

import { useRouter } from "@/lib/navigation";
import { Button } from "../ui/button"
import React from "react";
import { cn } from "@/lib/utils";

interface LoginButtonProps{
  className?: string
}

const LoginButton: React.FC<LoginButtonProps> = ({className}) => {
  const router = useRouter();

  return(
    <Button
      onClick={() => router.push("/login")}
      size="lg"
      variant="ghost"
      className={cn(
        "w-full cursor-pointer hover:text-white text-base py-6 glass hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center gap-2",
        className,
      )}
    >
      {/* Иконка входа */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      Войти в аккаунт
    </Button>
  )
}

export default LoginButton;