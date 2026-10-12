import { ArrowLeftRight, Boxes, PackageX, Search, TriangleAlert, Wallet } from "lucide-react"
import { useCallback, useMemo, useState, type FormEvent } from "react"

import Field from "@/components/Field"
import PageHeader from "@/components/PageHeader"
import StatCard from "@/components/StatCard"
import { MovementBadge, StockBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast } from "@/components/ui/toast"
import { formatBRL, formatDateTime, normalizeText, parseWholeNumber } from "@/lib/format"
import { stockStatus, stockValueCents } from "@/inventory/logic"
import type { MoveInput } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"

const MOVEMENT_HISTORY_LIMIT = 15

const typeHelp: Record<MoveInput["type"], { quantity: string; reason: string }> = {
  entrada: { quantity: "Quantidade que entrou", reason: "Motivo (opcional)" },
  saida: { quantity: "Quantidade que saiu", reason: "Motivo (ex.: avaria, perda, uso interno)" },
  ajuste: { quantity: "Quantidade contada (novo saldo)", reason: "Motivo (ex.: contagem de inventário)" },
}

function MovementForm({
  initialProductId,
  onDone,
  onCancel,
}: {
  initialProductId: string
  onDone: (message: string) => void
  onCancel: () => void
}) {
  const { products: allProducts, moveStock } = useInventory()
  const products = useMemo(() => allProducts.filter((item) => item.active), [allProducts])
  const [productId, setProductId] = useState(initialProductId || products[0]?.id || "")
  const [type, setType] = useState<MoveInput["type"]>("entrada")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const product = products.find((item) => item.id === productId)
  const parsed = parseWholeNumber(quantity)
  const preview =
    product && parsed !== null ? (type === "entrada" ? product.stock + parsed : type === "saida" ? product.stock - parsed : parsed) : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (parsed === null) return setError("Informe uma quantidade inteira (0 ou mais).")
    const result = moveStock({ productId, type, quantity: parsed, reason })
    if (!result.ok) return setError(result.error)
    onDone(`${result.value.productName}: saldo ${result.value.balance}`)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field id="mv-product" label="Produto">
        <Select
          id="mv-product"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value)
            setError("")
          }}
        >
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) — {item.stock} un.
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="mv-type" label="Tipo de movimentação">
          <Select
            id="mv-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as MoveInput["type"])
              setError("")
            }}
          >
            <option value="entrada">Entrada (reposição/compra)</option>
            <option value="saida">Saída (perda/avaria)</option>
            <option value="ajuste">Ajuste de contagem</option>
          </Select>
        </Field>
        <Field id="mv-quantity" label={typeHelp[type].quantity}>
          <Input
            id="mv-quantity"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              setError("")
            }}
            inputMode="numeric"
            placeholder="0"
            autoFocus
          />
        </Field>
      </div>

      <Field id="mv-reason" label={typeHelp[type].reason}>
        <Input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} />
      </Field>

      {product && (
        <p className="rounded-xl bg-[var(--color-paper)] px-3.5 py-3 text-sm text-[var(--color-slate)]">
          Saldo atual: <strong className="text-[var(--color-ink)]">{product.stock}</strong>
          {preview !== null && (
            <>
              {" "}
              → após a movimentação:{" "}
              <strong className={preview < 0 ? "text-[var(--color-alert-dark)]" : "text-[var(--color-ink)]"}>{preview}</strong>
            </>
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent">
          Registrar movimentação
        </Button>
      </div>
    </form>
  )
}

export default function Stock() {
  const { products, movements } = useInventory()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("todos")
  const [moving, setMoving] = useState<{ productId: string } | null>(null)
  const [toast, setToast] = useState<{ title: string; message?: string } | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const active = useMemo(() => products.filter((product) => product.active), [products])
  const totals = useMemo(
    () => ({
      units: active.reduce((sum, product) => sum + product.stock, 0),
      low: active.filter((product) => stockStatus(product) === "baixo").length,
      zero: active.filter((product) => stockStatus(product) === "zerado").length,
    }),
    [active],
  )

  const filtered = useMemo(() => {
    const term = normalizeText(query)
    return active
      .filter((product) => {
        if (term && !normalizeText(`${product.name} ${product.sku}`).includes(term)) return false
        return status === "todos" || stockStatus(product) === status
      })
      .sort((a, b) => a.stock / Math.max(a.minStock, 1) - b.stock / Math.max(b.minStock, 1))
  }, [active, query, status])

  return (
    <>
      <PageHeader
        eyebrow="Controle"
        title="Estoque"
        description="Acompanhe o saldo de cada produto e registre entradas, saídas e ajustes. Vendas e cancelamentos atualizam o saldo automaticamente."
        actions={
          <Button variant="accent" disabled={active.length === 0} onClick={() => setMoving({ productId: "" })}>
            <ArrowLeftRight className="h-4 w-4" />
            Registrar movimentação
          </Button>
        }
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unidades em estoque" value={String(totals.units)} meta={`${active.length} produtos ativos`} icon={Boxes} />
        <StatCard label="Valor em estoque (custo)" value={formatBRL(stockValueCents(active))} meta="Estoque atual × custo" icon={Wallet} />
        <StatCard label="Estoque baixo" value={String(totals.low)} meta="No mínimo ou abaixo" icon={TriangleAlert} alert={totals.low > 0} />
        <StatCard label="Sem estoque" value={String(totals.zero)} meta="Indisponíveis para venda" icon={PackageX} alert={totals.zero > 0} />
      </section>

      <Card className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        <div className="grid gap-3 border-b border-[var(--color-border)] p-4 sm:grid-cols-[1fr_220px] sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
            <Input
              aria-label="Buscar no estoque"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou SKU"
              className="pl-9"
            />
          </div>
          <Select aria-label="Filtrar por situação do estoque" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todas as situações</option>
            <option value="normal">Normal</option>
            <option value="baixo">Estoque baixo</option>
            <option value="zerado">Sem estoque</option>
          </Select>
        </div>

        {active.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[var(--color-slate)]">
            Nenhum produto ativo. Cadastre produtos na tela de Produtos para controlar o estoque.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm font-semibold">Nenhum produto encontrado com esses filtros.</p>
        ) : (
          <Table>
            <caption className="sr-only">Saldo de estoque por produto, dos mais críticos para os menos críticos</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Produto</TableHead>
                <TableHead scope="col" className="text-right">
                  Saldo
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Mínimo
                </TableHead>
                <TableHead scope="col">Situação</TableHead>
                <TableHead scope="col" className="text-right">
                  Ação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <p className="font-semibold">{product.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--color-slate)]">{product.sku}</p>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{product.stock}</TableCell>
                  <TableCell className="text-right tabular-nums text-[var(--color-slate)]">{product.minStock}</TableCell>
                  <TableCell>
                    <StockBadge product={product} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMoving({ productId: product.id })}
                      aria-label={`Movimentar ${product.name}`}
                    >
                      Movimentar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-slate)]">Rastreabilidade</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">Histórico de movimentações</h2>
        </div>
        {movements.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[var(--color-slate)]">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <Table>
            <caption className="sr-only">Últimas movimentações de estoque</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Data</TableHead>
                <TableHead scope="col">Produto</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col" className="text-right">
                  Variação
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Saldo
                </TableHead>
                <TableHead scope="col">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.slice(0, MOVEMENT_HISTORY_LIMIT).map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap text-[var(--color-slate)]">{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-semibold">{movement.productName}</p>
                    <p className="font-mono text-[11px] text-[var(--color-slate)]">{movement.sku}</p>
                  </TableCell>
                  <TableCell>
                    <MovementBadge type={movement.type} />
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${movement.delta < 0 ? "text-[var(--color-alert-dark)]" : "text-[var(--color-stock-green)]"}`}
                  >
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{movement.balance}</TableCell>
                  <TableCell className="text-[var(--color-slate)]">{movement.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {movements.length > MOVEMENT_HISTORY_LIMIT && (
          <p className="border-t border-[var(--color-border)] px-6 py-3 text-xs text-[var(--color-slate)]">
            Mostrando as {MOVEMENT_HISTORY_LIMIT} movimentações mais recentes de {movements.length}.
          </p>
        )}
      </Card>

      <Dialog
        open={moving !== null}
        onClose={() => setMoving(null)}
        title="Registrar movimentação"
        description="Entradas, saídas e ajustes ficam registrados no histórico."
      >
        {moving !== null && (
          <MovementForm
            initialProductId={moving.productId}
            onCancel={() => setMoving(null)}
            onDone={(message) => {
              setMoving(null)
              setToast({ title: "Movimentação registrada", message })
            }}
          />
        )}
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} message={toast?.message} tone="success" onClose={closeToast} />
    </>
  )
}
