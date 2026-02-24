"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce" // npm i use-debounce или напишите свой дебаунс
import { PaymentStatus } from "@prisma/client"

export function PaymentFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1") // Сброс на 1 страницу при поиске
    if (term) {
      params.set("search", term)
    } else {
      params.delete("search")
    }
    replace(`${pathname}?${params.toString()}`)
  }, 300)

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1")
    if (status && status !== "all") {
      params.set("status", status)
    } else {
      params.delete("status")
    }
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
      <input
        placeholder="Поиск по ID заказа, Email..."
        className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get("search")?.toString()}
      />
      
      <select
        className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(e) => handleStatusChange(e.target.value)}
        defaultValue={searchParams.get("status")?.toString() || "all"}
      >
        <option value="all">Все статусы</option>
        {Object.values(PaymentStatus).map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    </div>
  )
}