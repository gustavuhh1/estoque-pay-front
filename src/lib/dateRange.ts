/** Período em dias inteiros, no fuso do navegador ("2026-11-13"). Sem período = todas as datas. */
export type DateRange = { from: string; to: string }

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return iso(date)
}

function startOfMonth(offset = 0) {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

export const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Hoje", range: () => ({ from: daysAgo(0), to: daysAgo(0) }) },
  { label: "Ontem", range: () => ({ from: daysAgo(1), to: daysAgo(1) }) },
  { label: "Últimos 7 dias", range: () => ({ from: daysAgo(6), to: daysAgo(0) }) },
  { label: "Últimos 30 dias", range: () => ({ from: daysAgo(29), to: daysAgo(0) }) },
  { label: "Este mês", range: () => ({ from: iso(startOfMonth()), to: daysAgo(0) }) },
  {
    label: "Mês passado",
    range: () => {
      const last = startOfMonth()
      last.setDate(0)
      return { from: iso(startOfMonth(-1)), to: iso(last) }
    },
  },
]

/** Início (00:00) e fim (23:59:59.999) do período em milissegundos, no horário local. */
export function rangeBounds(range: DateRange) {
  const [fy, fm, fd] = range.from.split("-").map(Number)
  const [ty, tm, td] = range.to.split("-").map(Number)
  return { start: new Date(fy, fm - 1, fd).getTime(), end: new Date(ty, tm - 1, td, 23, 59, 59, 999).getTime() }
}

const short = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
const fromIso = (value: string) => new Date(rangeBounds({ from: value, to: value }).start)

/** Nome do período para o botão: o atalho que bate ou "13 nov – 20 nov". */
export function rangeLabel(range: DateRange | null) {
  if (!range) return "Todas as datas"
  const preset = PRESETS.find((item) => {
    const candidate = item.range()
    return candidate.from === range.from && candidate.to === range.to
  })
  if (preset) return preset.label
  if (range.from === range.to) return short.format(fromIso(range.from)).replace(".", "")
  return `${short.format(fromIso(range.from))} – ${short.format(fromIso(range.to))}`.replace(/\./g, "")
}

