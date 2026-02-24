"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface PaginationProps {
  totalPages: number
  currentPage: number
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { replace } = useRouter()

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <button
        disabled={currentPage <= 1}
        onClick={() => replace(createPageURL(currentPage - 1))}
        className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 text-sm"
      >
        Назад
      </button>
      <span className="text-zinc-400 text-sm">
        Стр. {currentPage} из {totalPages}
      </span>
      <button
        disabled={currentPage >= totalPages}
        onClick={() => replace(createPageURL(currentPage + 1))}
        className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 text-sm"
      >
        Вперед
      </button>
    </div>
  )
}