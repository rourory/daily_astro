"use client";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import IosInstruction from "./ios-instruction";
import React from "react";
interface InstallAppButtonProps {
  installApp: () => any;
  isIOS: boolean;
  setShowIosHint: (prop: boolean) => any;
  className?: string;
  showIosHint: boolean;
}

const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  installApp,
  isIOS,
  setShowIosHint,
  showIosHint,
  className,
}) => {
  const handleInstallClick = () => {
    if (isIOS) {
      setShowIosHint(true);
    } else {
      installApp();
    }
  };

  return (
    <>
      <Button
        onClick={handleInstallClick}
        size="lg"
        variant="ghost"
        className={cn(
          "w-full cursor-pointer hover:text-white text-base py-6 glass hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center gap-2",
          className,
        )}
      >
        {/* Иконка скачивания */}
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Установить приложение
      </Button>

      <IosInstruction
        isOpen={showIosHint}
        onClose={() => setShowIosHint(false)}
      />
    </>
  );
};

export default InstallAppButton;
