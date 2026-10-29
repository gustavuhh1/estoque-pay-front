import { Banknote, Download, FileDown, FileText, Lock, LockOpen, QrCode, RotateCcw, Search } from "lucide-react"
import { useMemo, useState } from "react"

import AlertBanner from "@/components/AlertBanner"
import MetricCard from "@/components/MetricCard"
import PageHeader from "@/components/PageHeader"
import CashDialog from "@/components/sales/CashDialog"
import NoteDialog from "@/components/sales/NoteDialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { shiftTotals } from "@/caixa/caixa"
import { useCash } from "@/caixa/useCash"
import { downloadCsv } from "@/lib/download"
import { formatBRL, formatDateTime, normalizeText, saleLabel } from "@/lib/format"
import { PAYMENT_LABELS, type Sale } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

const FILTERS = ["Todas", "Pagas", "Pendentes", "Canceladas"] as const
type Filter = (typeof FILTERS)[number]

const chip = (active: boolean) =>
  `inline-flex min-h-11 items-center rounded-full border px-5 text-[15px] font-bold transition ${
    active
      ? "border-[var(--color-green-100)] bg-[var(--color-green-100)] text-[var(--color-amber-dark)]"
      : "border-[var(--color-border)] bg-white hover:border-[var(--color-green-500)]/50"
  }`

const pill = "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em]"

/** Número da venda no modo demonstração, ou o código curto da venda vinda da API. */

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

export default function Sales() {
  const { activeStore } = useStores()
  const { sales, cancelSale } = useInventory()
  // Cancelar venda e fechar o caixa são ações de Owner e Gestor; o Colaborador (caixa) só consulta.
  const canManage = activeStore.role !== "Colaborador"

  const cashState = useCash()
  const [filter, setFilter] = useState<Filter>("Todas")
  const [query, setQuery] = useState("")
  const [noteOf, setNoteOf] = useState<Sale | null>(null)
  const [canceling, setCanceling] = useState<Sale | null>(null)
  const [cancelError, setCancelError] = useState("")
  const [cashDialog, setCashDialog] = useState<"open" | "close" | null>(null)
  const [toast, setToast] = useState<{ title: string; message?: string; tone: ToastTone } | null>(null)

  const shift = cashState.shift
  const totals = useMemo(() => (shift ? shiftTotals(sales, shift) : null), [sales, shift])
  const canceledCount = sales.filter((sale) => sale.status === "cancelada" && (!shift || sale.createdAt >= shift.openedAt)).length
  const simulated = sales.filter((sale) => sale.status === "concluida" && sale.nfce !== false).length

  const rows = useMemo(() => {
    const term = normalizeText(query).replace(/^#/, "")
    return [...sales]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((sale) => {
        if (filter === "Pagas" && sale.status !== "concluida") return false
        if (filter === "Pendentes" && sale.status !== "pendente") return false
        if (filter === "Canceladas" && sale.status !== "cancelada") return false
        if (!term) return true
        return normalizeText(`${saleLabel(sale)} ${sale.customerName ?? ""} ${sale.items.map((item) => item.name).join(" ")}`).includes(term)
      })
  }, [sales, filter, query])

  async function openCash(openingCents: number) {
    const result = await cashState.open(openingCents)
    if (!result.ok) return setToast({ title: "Não foi possível abrir o caixa", message: result.error, tone: "error" })
    setCashDialog(null)
    setToast({ title: "Caixa aberto", tone: "success" })
  }

  async function closeCash(countedCents: number) {
    const result = await cashState.close(countedCents)
    if (!result.ok) return setToast({ title: "Não foi possível fechar o caixa", message: result.error, tone: "error" })
    setCashDialog(null)
    setToast({ title: "Caixa fechado", tone: "success" })
  }

  async function confirmCancel() {
    if (!canceling) return
    const result = await cancelSale(canceling.id)
    if (!result.ok) return setCancelError(result.error)
    setToast({ title: "Venda cancelada", message: `${saleLabel(canceling)} — os itens voltaram ao estoque.`, tone: "info" })
    setCanceling(null)
  }

  function exportCsv() {
    downloadCsv("vendas.csv", [
      ["Venda", "Data", "Operador", "Cliente", "CPF", "Itens", "Método", "Desconto", "Total", "Situação"],
      ...rows.map((sale) => [
        saleLabel(sale),
        formatDateTime(sale.createdAt),
        sale.operator ?? "",
        sale.customerName ?? "Consumidor não identificado",
        sale.cpf ?? "",
        sale.items.length,
        PAYMENT_LABELS[sale.payment],
        ((sale.discountCents ?? 0) / 100).toFixed(2).replace(".", ","),
        (sale.totalCents / 100).toFixed(2).replace(".", ","),
        sale.status === "concluida" ? "Paga" : "Cancelada",
      ]),
    ])
  }

  return (
    <>
      <PageHeader
        title="Vendas"
        description="Histórico do turno, meios de pagamento e situação fiscal."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            {shift ? (
              <Button variant="outline" onClick={() => setCashDialog("close")} disabled={!canManage} title={canManage ? undefined : "Só Owner e Gestor fecham o caixa"}>
                <Lock className="h-4 w-4" />
                Fechar caixa
              </Button>
            ) : (
              <Button variant="accent" onClick={() => setCashDialog("open")} disabled={!canManage} title={canManage ? undefined : "Só Owner e Gestor abrem o caixa"}>
                <LockOpen className="h-4 w-4" />
                Abrir caixa
              </Button>
            )}
          </>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Banknote} label="Faturamento do turno" value={formatBRL(totals?.totalCents ?? 0)} badge={shift ? "Turno aberto" : "Caixa fechado"} tone={shift ? "brand" : "warning"} />
        <MetricCard icon={QrCode} tone="info" label="Pix recebido" value={formatBRL(totals?.byMethod.pix ?? 0)} badge="Split R$ 0,80" />
        <MetricCard icon={FileText} tone="warning" label="NFC-e simuladas" value={`${simulated} ${simulated === 1 ? "nota" : "notas"}`} badge="Sem valor fiscal" />
        <MetricCard icon={RotateCcw} tone="danger" label="Cancelamentos" value={`${canceledCount} ${canceledCount === 1 ? "venda" : "vendas"}`} badge="Estornado" />
      </section>

      {!shift && (
        <div className="mt-6">
          <AlertBanner
            tone="warning"
            title="Caixa fechado"
            description="O PDV só registra vendas com o caixa aberto. Abra o caixa para começar um novo turno."
            actionLabel={canManage ? "Abrir caixa" : undefined}
            onAction={() => setCashDialog("open")}
          />
        </div>
      )}

      <div className="mb-5 mt-8 flex flex-wrap items-center gap-2.5">
        {FILTERS.map((item) => (
          <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={chip(filter === item)}>
            {item}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar venda"
            placeholder="Buscar venda..."
            className="h-11 w-full rounded-xl bg-[var(--color-nav)] pl-9 pr-3 text-sm font-medium outline-none placeholder:text-[var(--color-slate)] focus-visible:ring-2 focus-visible:ring-[var(--color-green-500)]/35"
          />
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        {sales.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[var(--color-slate)]">Nenhuma venda registrada. Registre a primeira venda no PDV para ver o histórico aqui.</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm font-semibold">Nenhuma venda encontrada com esses filtros.</p>
        ) : (
          <Table>
            <caption className="sr-only">Histórico de vendas</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Venda</TableHead>
                <TableHead scope="col">Cliente</TableHead>
                <TableHead scope="col" className="text-center">
                  Itens
                </TableHead>
                <TableHead scope="col" className="text-center">
                  Método
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Total
                </TableHead>
                <TableHead scope="col" className="text-center">
                  Pagamento
                </TableHead>
                <TableHead scope="col" className="text-center">
                  NFC-e
                </TableHead>
                <TableHead scope="col" className="text-right">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((sale) => {
                const done = sale.status === "concluida"
                const pending = sale.status === "pendente"
                const hasNote = done && sale.nfce !== false
                return (
                  <TableRow key={sale.id} className="h-[72px]">
                    <TableCell>
                      <p className="font-[family-name:var(--font-mono)] font-bold">{saleLabel(sale)}</p>
                      <p className="max-w-[170px] truncate text-[13px] text-[#94a3b8]">
                        {timeFormatter.format(sale.createdAt)} · {sale.operator ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{sale.customerName ?? "Consumidor não identificado"}</TableCell>
                    <TableCell className="text-center tabular-nums">{sale.items.length}</TableCell>
                    <TableCell className="text-center">
                      <span className={`${pill} bg-[var(--color-paper-dim)] text-[var(--color-slate)]`}>{PAYMENT_LABELS[sale.payment]}</span>
                    </TableCell>
                    <TableCell className={`text-right text-[17px] font-bold tabular-nums ${done ? "" : "text-[var(--color-slate)] line-through"}`}>{formatBRL(sale.totalCents)}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`${pill} ${
                          done
                            ? "border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]"
                            : pending
                              ? "border border-[#fde68a] bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
                              : "bg-[var(--color-ink)] text-white"
                        }`}
                      >
                        {done ? "Pago" : pending ? "Pendente" : "Cancelado"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {hasNote ? <span className={`${pill} bg-[var(--color-info-soft)] text-[var(--color-info)]`}>Simulada</span> : <span className={`${pill} bg-[var(--color-paper-dim)] text-[var(--color-slate)]`}>—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex gap-1">
                        <button
                          type="button"
                          aria-label={`Ver nota simulada da venda ${saleLabel(sale)}`}
                          title={hasNote ? "Ver nota (simulada)" : "Esta venda não gerou NFC-e"}
                          disabled={!hasNote}
                          onClick={() => setNoteOf(sale)}
                          className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)] disabled:opacity-40"
                        >
                          <FileDown className="h-[18px] w-[18px]" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Cancelar venda ${saleLabel(sale)}`}
                          title={canManage ? "Cancelar venda" : "Só Owner e Gestor cancelam vendas"}
                          disabled={!done || !canManage}
                          onClick={() => {
                            setCancelError("")
                            setCanceling(sale)
                          }}
                          className="rounded-lg p-2 text-[var(--color-alert)] transition hover:bg-[var(--color-alert-soft)] disabled:opacity-40"
                        >
                          <RotateCcw className="h-[18px] w-[18px]" />
                        </button>
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {noteOf && <NoteDialog sale={noteOf} onClose={() => setNoteOf(null)} />}
      {cashDialog === "open" && <CashDialog mode="open" onConfirm={openCash} onClose={() => setCashDialog(null)} />}
      {cashDialog === "close" && shift && totals && <CashDialog mode="close" shift={shift} totals={totals} onConfirm={closeCash} onClose={() => setCashDialog(null)} />}

      <Dialog
        open={canceling !== null}
        onClose={() => setCanceling(null)}
        title={canceling ? `Cancelar venda ${saleLabel(canceling)}?` : "Cancelar venda"}
        description="Os itens voltam ao estoque e a venda deixa de contar no faturamento. Essa ação não pode ser desfeita."
      >
        {canceling && (
          <div>
            {cancelError && (
              <p role="alert" className="mb-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
                {cancelError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setCanceling(null)}>
                Manter venda
              </Button>
              <Button variant="default" onClick={confirmCancel}>
                Cancelar venda
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} message={toast?.message} tone={toast?.tone ?? "success"} onClose={() => setToast(null)} />
    </>
  )
}
