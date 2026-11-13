import { Ban, CalendarClock, Copy, Eye, HandCoins, Ticket, TicketCheck, Users } from "lucide-react"
import { useMemo, useState } from "react"

import CategoryScroller from "@/components/CategoryScroller"
import CouponDialog from "@/components/customers/CouponDialog"
import MetricCard from "@/components/MetricCard"
import PageHeader from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { couponDiscountLabel, couponStatus, isGlobal, type Coupon, type CouponStatus, type CouponUse } from "@/customers/coupons"
import { useCustomers } from "@/customers/useCustomers"
import { formatBRL, formatDateTime, maskCpf } from "@/lib/format"
import { useStores } from "@/store/useStores"

const FILTERS = ["Ativos", "Encerrados", "Todos"] as const
type Filter = (typeof FILTERS)[number]

const mono = "font-[family-name:var(--font-mono)]"
const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]"
const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
const WEEK = 7 * 86_400_000

const STATUS_PILL: Record<CouponStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]" },
  usado: { label: "Usado", className: "bg-[var(--color-info-soft)] text-[var(--color-info)]" },
  expirado: { label: "Expirado", className: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]" },
  desativado: { label: "Desativado", className: "bg-[var(--color-paper-dim)] text-[var(--color-slate)]" },
}

const usesOf = (coupon: Coupon) => coupon.usesCount ?? coupon.uses?.length ?? (coupon.redeemedAt ? 1 : 0)
const givenOf = (coupon: Coupon) => coupon.discountTotalCents ?? (coupon.uses ?? []).reduce((sum, use) => sum + use.discountCents, 0)

export default function Coupons() {
  const { activeStoreId } = useStores()
  return <CouponManager key={activeStoreId} storeId={activeStoreId} />
}

function CouponManager({ storeId }: { storeId: string }) {
  const { activeStore } = useStores()
  const { customers, coupons, isLoading, error, issue, disable, uses } = useCustomers(storeId)
  const canManage = activeStore.role !== "Colaborador"
  const [filter, setFilter] = useState<Filter>("Ativos")
  const [now] = useState(() => Date.now())
  const [issuing, setIssuing] = useState(false)
  const [disabling, setDisabling] = useState<Coupon | null>(null)
  const [viewing, setViewing] = useState<{ coupon: Coupon; uses: CouponUse[] | null; error: string } | null>(null)
  const [toast, setToast] = useState<{ title: string; tone: ToastTone } | null>(null)

  const nameOf = (coupon: Coupon) => coupon.customerName ?? customers.find((customer) => customer.id === coupon.customerId)?.name ?? "Cliente"
  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [customers])
  const sorted = useMemo(() => [...coupons].sort((a, b) => b.createdAt - a.createdAt), [coupons])
  const active = sorted.filter((coupon) => couponStatus(coupon) === "ativo")
  const counts = { Ativos: active.length, Encerrados: sorted.length - active.length, Todos: sorted.length }
  const rows = filter === "Todos" ? sorted : filter === "Ativos" ? active : sorted.filter((coupon) => couponStatus(coupon) !== "ativo")

  const totalUses = sorted.reduce((sum, coupon) => sum + usesOf(coupon), 0)
  const totalGiven = sorted.reduce((sum, coupon) => sum + givenOf(coupon), 0)
  const expiringSoon = active.filter((coupon) => coupon.expiresAt !== undefined && coupon.expiresAt - now < WEEK).length

  async function openUses(coupon: Coupon) {
    setViewing({ coupon, uses: null, error: "" })
    const result = await uses(coupon.id)
    setViewing((current) => (current?.coupon.id === coupon.id ? { coupon, uses: result.ok ? result.value : [], error: result.ok ? "" : result.error } : current))
  }

  async function confirmDisable() {
    if (!disabling) return
    const result = await disable(disabling.id)
    setToast(result.ok ? { title: `Cupom ${disabling.code} desativado`, tone: "info" } : { title: result.error, tone: "error" })
    setDisabling(null)
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setToast({ title: `Código ${code} copiado`, tone: "success" })
    } catch {
      setToast({ title: "Não foi possível copiar o código", tone: "error" })
    }
  }

  const whoCell = (coupon: Coupon) =>
    isGlobal(coupon) ? (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <Users className="h-4 w-4 text-[var(--color-amber)]" />
        <span>
          Todos os clientes <span className="text-xs text-[var(--color-slate)]">· 1× por CPF</span>
        </span>
      </span>
    ) : (
      <span className="text-sm">{nameOf(coupon)}</span>
    )

  const validityText = (coupon: Coupon) => (coupon.expiresAt ? `até ${dateLabel.format(coupon.expiresAt)}` : "Sem validade")

  const actions = (coupon: Coupon) => {
    const status = couponStatus(coupon)
    return (
      <span className="inline-flex gap-0.5">
        <button type="button" onClick={() => copy(coupon.code)} aria-label={`Copiar código ${coupon.code}`} title="Copiar código" className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)]">
          <Copy className="h-[18px] w-[18px]" />
        </button>
        <button type="button" onClick={() => openUses(coupon)} aria-label={`Ver usos do cupom ${coupon.code}`} title="Ver quem usou" className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)]">
          <Eye className="h-[18px] w-[18px]" />
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => setDisabling(coupon)}
            disabled={status !== "ativo"}
            aria-label={`Desativar cupom ${coupon.code}`}
            title={status === "ativo" ? "Desativar cupom" : "Cupom já encerrado"}
            className="rounded-lg p-2 text-[var(--color-alert)] transition hover:bg-[var(--color-alert-soft)] disabled:opacity-30"
          >
            <Ban className="h-[18px] w-[18px]" />
          </button>
        )}
      </span>
    )
  }

  return (
    <>
      <PageHeader
        title="Cupons"
        description="Crie descontos para seus clientes e acompanhe quem usou."
        actions={
          canManage && (
            <Button variant="accent" onClick={() => setIssuing(true)}>
              <Ticket className="h-4 w-4" />
              Emitir cupom
            </Button>
          )
        }
      />

      <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumo dos cupons">
        <MetricCard compact icon={TicketCheck} label="Cupons ativos" value={String(active.length)} badge={`${sorted.length} no total`} tone="brand" />
        <MetricCard compact icon={Users} tone="info" label="Vezes usados" value={String(totalUses)} badge="Vendas com cupom" />
        <MetricCard compact icon={HandCoins} tone="warning" label="Desconto concedido" value={formatBRL(totalGiven)} badge="Soma de todos os usos" />
        <MetricCard compact icon={CalendarClock} tone="danger" label="Vencem em 7 dias" value={String(expiringSoon)} badge="Ainda ativos" />
      </section>

      <div className="mt-5">
        <CategoryScroller label="Situação" items={FILTERS} counts={counts} active={filter} onSelect={(item) => setFilter(item as Filter)} />
      </div>

      <Card className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-0 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        {isLoading ? (
          <p role="status" className="px-6 py-14 text-center text-sm text-[var(--color-slate)]">Carregando cupons…</p>
        ) : error ? (
          <p role="alert" className="px-6 py-14 text-center text-sm font-semibold text-[var(--color-alert-dark)]">{error}</p>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Ticket className="mx-auto h-10 w-10 text-[var(--color-green-500)]" />
            <p className="mt-3 text-sm font-semibold">{sorted.length === 0 ? "Nenhum cupom ainda." : "Nenhum cupom nesta situação."}</p>
            {sorted.length === 0 && canManage && (
              <p className="mt-1 text-sm text-[var(--color-slate)]">Crie o primeiro: um desconto para todos ou um presente para um cliente especial.</p>
            )}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[var(--color-border)] md:hidden" aria-label="Cupons">
              {rows.map((coupon) => {
                const status = STATUS_PILL[couponStatus(coupon)]
                return (
                  <li key={coupon.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span className={`${mono} text-sm font-bold`}>{coupon.code}</span>
                        <span className={`${pill} ${status.className}`}>{status.label}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-slate)]">
                        {couponDiscountLabel(coupon)} · {isGlobal(coupon) ? "Todos (1× por CPF)" : nameOf(coupon)} · {validityText(coupon)}
                      </p>
                      <p className="text-xs text-[var(--color-slate)]">
                        {usesOf(coupon)} {usesOf(coupon) === 1 ? "uso" : "usos"} · {formatBRL(givenOf(coupon))} em descontos
                      </p>
                    </div>
                    {actions(coupon)}
                  </li>
                )
              })}
            </ul>

            <div className="hidden md:block">
              <Table>
                <caption className="sr-only">Cupons da loja</caption>
                <TableHeader>
                  <TableRow className="bg-[var(--color-paper)]/60 hover:bg-[var(--color-paper)]/60">
                    <TableHead scope="col" className="pl-5">Cupom</TableHead>
                    <TableHead scope="col">Quem pode usar</TableHead>
                    <TableHead scope="col" className="text-center">Validade</TableHead>
                    <TableHead scope="col" className="text-right">Usos</TableHead>
                    <TableHead scope="col" className="text-center">Situação</TableHead>
                    <TableHead scope="col" className="pr-5 text-right"><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((coupon) => {
                    const status = STATUS_PILL[couponStatus(coupon)]
                    return (
                      <TableRow key={coupon.id}>
                        <TableCell className="py-2.5 pl-5">
                          <p className={`${mono} font-bold tracking-[0.04em]`}>{coupon.code}</p>
                          <p className="text-[13px] font-semibold text-[var(--color-amber-dark)]">{couponDiscountLabel(coupon)} de desconto</p>
                        </TableCell>
                        <TableCell className="py-2.5">{whoCell(coupon)}</TableCell>
                        <TableCell className="py-2.5 text-center text-sm">{validityText(coupon)}</TableCell>
                        <TableCell className="py-2.5 text-right">
                          <p className="font-bold tabular-nums">{usesOf(coupon)}</p>
                          <p className="text-xs text-[var(--color-slate)]">{formatBRL(givenOf(coupon))}</p>
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <span className={`${pill} ${status.className}`}>{status.label}</span>
                        </TableCell>
                        <TableCell className="py-2.5 pr-5 text-right">{actions(coupon)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {issuing && <CouponDialog customers={sortedCustomers} onIssue={issue} onClose={() => setIssuing(false)} />}

      <Dialog
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `Usos do cupom ${viewing.coupon.code}` : "Usos do cupom"}
        description={viewing ? `${couponDiscountLabel(viewing.coupon)} de desconto · ${isGlobal(viewing.coupon) ? "todos os clientes, 1× por CPF" : nameOf(viewing.coupon)}` : undefined}
        widthClass="max-w-[520px]"
      >
        {viewing &&
          (viewing.uses === null ? (
            <p role="status" className="py-8 text-center text-sm text-[var(--color-slate)]">Carregando…</p>
          ) : viewing.error ? (
            <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3.5 py-3 text-sm font-medium text-[var(--color-alert-dark)]">{viewing.error}</p>
          ) : viewing.uses.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-slate)]">Ninguém usou este cupom ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
              {viewing.uses.map((use) => (
                <li key={use.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{use.customerName ?? "Cliente"}</p>
                    <p className={`text-xs text-[var(--color-slate)] ${mono}`}>
                      CPF {use.cpf.includes("*") ? use.cpf : maskCpf(use.cpf)} · {formatDateTime(use.usedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-[var(--color-amber-dark)]">−{formatBRL(use.discountCents)}</span>
                </li>
              ))}
            </ul>
          ))}
      </Dialog>

      <Dialog
        open={disabling !== null}
        onClose={() => setDisabling(null)}
        title={disabling ? `Desativar o cupom ${disabling.code}?` : "Desativar cupom"}
        description="Ele deixa de ser aceito no PDV na hora. Os usos que já aconteceram continuam no histórico."
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDisabling(null)}>
            Manter ativo
          </Button>
          <Button variant="default" onClick={confirmDisable}>
            Desativar cupom
          </Button>
        </div>
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} tone={toast?.tone ?? "success"} onClose={() => setToast(null)} />
    </>
  )
}
