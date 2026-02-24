"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"
import { ZodiacSign } from "@prisma/client"

// Словарь для красивого отображения знаков (можно вынести в отдельный файл)
const ZODIAC_LABELS: Record<string, string> = {
  aries: "Овен ♈",
  taurus: "Телец ♉",
  gemini: "Близнецы ♊",
  cancer: "Рак ♋",
  leo: "Лев ♌",
  virgo: "Дева ♍",
  libra: "Весы ♎",
  scorpio: "Скорпион ♏",
  sagittarius: "Стрелец ♐",
  capricorn: "Козерог ♑",
  aquarius: "Водолей ♒",
  pisces: "Рыбы ♓",
}

export function UserFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1")
    if (term) {
      params.set("search", term)
    } else {
      params.delete("search")
    }
    replace(`${pathname}?${params.toString()}`)
  }, 300)

  const handleZodiacChange = (sign: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1")
    if (sign && sign !== "all") {
      params.set("zodiac", sign)
    } else {
      params.delete("zodiac")
    }
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
      <input
        placeholder="Поиск по Telegram ID или Email..."
        className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get("search")?.toString()}
      />
      
      <select
        className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(e) => handleZodiacChange(e.target.value)}
        defaultValue={searchParams.get("zodiac")?.toString() || "all"}
      >
        <option value="all">Все знаки</option>
        {Object.values(ZodiacSign).map((sign) => (
          <option key={sign} value={sign}>
            {ZODIAC_LABELS[sign] || sign}
          </option>
        ))}
      </select>
    </div>
  )
}