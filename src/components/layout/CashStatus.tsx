import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { useCash } from "@/caixa/useCash"

/** 3725 s → "1:02:05"; abaixo de 1 h → "02:05". */
function elapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
  const s = String(total % 60).padStart(2, "0")
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}

/** Situação do caixa sempre à vista no topo: aberto (com o tempo contando) ou fechado. Leva para Vendas, onde se abre e fecha. */
export default function CashStatus() {
  const { shift, isLoading } = useCash()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!shift) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [shift])

  if (isLoading) return <span className="hidden h-10 w-36 animate-pulse rounded-xl bg-[var(--color-nav)] sm:block" aria-hidden />

  const since = shift ? new Date(shift.openedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""

  return (
    <Link
      to="/vendas"
      title={shift ? `Caixa aberto às ${since} por ${shift.operator}` : "Caixa fechado. Abra em Vendas para começar a vender."}
      aria-label={shift ? `Caixa aberto há ${elapsed(now - shift.openedAt)}` : "Caixa fechado"}
      className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition hover:opacity-85 ${
        shift
          ? "border-[var(--color-amber)]/25 bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"
          : "border-[var(--color-alert)]/25 bg-[var(--color-alert-soft)] text-[var(--color-alert)]"
      }`}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {shift && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-amber)] opacity-60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${shift ? "bg-[var(--color-amber)]" : "bg-[var(--color-alert)]"}`} />
      </span>
      <span className="hidden whitespace-nowrap sm:inline">{shift ? "Caixa aberto" : "Caixa fechado"}</span>
      {shift && <span className="font-mono tabular-nums">{elapsed(now - shift.openedAt)}</span>}
    </Link>
  )
}
