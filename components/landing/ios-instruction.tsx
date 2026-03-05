"use client";

import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function IosInstruction({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-zinc-900 text-white rounded-t-2xl sm:rounded-xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Установить приложение</h3>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm sm:text-base text-zinc-300">
          <p>
            Установите приложение на свой iPhone для быстрого доступа и
            уведомлений:
          </p>

          <div className="flex items-center gap-4 bg-zinc-800 p-3 rounded-lg">
            <span className="text-2xl">1</span>
            <div className="flex-1">
              Нажмите кнопку
              <span className="inline-flex mx-1 items-center justify-center bg-zinc-700 p-1 rounded">
                {/* Иконка Share iOS */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-400"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </span>
              <span className="font-bold text-white">Поделиться</span> внизу
              экрана.
            </div>
          </div>

          <div className="flex items-center gap-4 bg-zinc-800 p-3 rounded-lg">
            <span className="text-2xl">2</span>
            <div className="flex-1">
              Прокрутите вниз и выберите
              <br />
              <span className="font-bold text-white inline-flex items-center gap-1">
                <span className="bg-zinc-700 p-0.5 rounded text-xs border border-zinc-600">
                  +
                </span>{" "}
                На экран «Домой»
              </span>
              .
            </div>
          </div>
        </div>

        {/* Стрелочка вниз, указывающая на кнопку Share (визуальный сахар) */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-zinc-900 sm:hidden">
          ▼
        </div>
      </div>
    </div>
  );
}
