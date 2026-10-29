import { ArrowDownToLine, Filter, List, Package, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import AlertBanner from "@/components/AlertBanner"
import PageHeader from "@/components/PageHeader"
import CategoriesDialog from "@/components/stock/CategoriesDialog"
import MovementDialog from "@/components/stock/MovementDialog"
import ProductDialog from "@/components/stock/ProductDialog"
import { MovementBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { formatBRL, formatDateTime, formatQuantity, normalizeText } from "@/lib/format"
import { missingFiscal, stockStatus } from "@/inventory/logic"
import type { Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

const MOVEMENT_HISTORY_LIMIT = 15

const chip = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[15px] font-bold transition ${
    active
      ? "border-[var(--color-green-100)] bg-[var(--color-green-100)] text-[var(--color-amber-dark)]"
      : "border-[var(--color-border)] bg-white hover:border-[var(--color-green-500)]/50"
  }`

function StatusPill({ product }: { product: Product }) {
  const base = "inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em]"
  if (!product.active) return <span className={`${base} bg-[var(--color-paper-dim)] text-[var(--color-slate)]`}>Inativo</span>
  const status = stockStatus(product)
  if (status === "zerado") return <span className={`${base} bg-[var(--color-ink)] text-white`}>Crítico / Esgotado</span>
  if (status === "baixo")
    return <span className={`${base} border border-[#fde68a] bg-[var(--color-warn-soft)] text-[var(--color-warn)]`}>Atenção / Baixo</span>
  return <span className={`${base} border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]`}>Conforme</span>
}

const quantityTone = (product: Product) => {
  const status = stockStatus(product)
  return status === "zerado" ? "text-[var(--color-alert)]" : status === "baixo" ? "text-[var(--color-warn)]" : "text-[var(--color-amber)]"
}

export default function Stock() {
  const { activeStore } = useStores()
  const { products, movements, categories, setProductActive } = useInventory()
  const nfceEnabled = activeStore.nfceEnabled ?? true

  const [category, setCategory] = useState("Todos")
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState("")
  const [onlyCritical, setOnlyCritical] = useState(false)
  const [editing, setEditing] = useState<Product | "new" | null>(null)
  const [moving, setMoving] = useState<{ productId: string } | null>(null)
  const [managingCategories, setManagingCategories] = useState(false)
  const [removing, setRemoving] = useState<Product | null>(null)
  const [toast, setToast] = useState<{ title: string; message?: string; tone: ToastTone } | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const chips = useMemo(() => {
    const used = products.map((product) => product.category).filter((name) => !categories.includes(name))
    return ["Todos", ...categories, ...new Set(used)]
  }, [categories, products])

  const critical = useMemo(() => products.filter((product) => product.active && stockStatus(product) !== "normal"), [products])
  const fiscalLocked = useMemo(
    () => (nfceEnabled ? products.filter((product) => !product.active && missingFiscal(product)) : []),
    [products, nfceEnabled],
  )

  const rows = useMemo(() => {
    const term = normalizeText(query)
    return products
      .filter((product) => {
        if (category !== "Todos" && product.category !== category) return false
        if (onlyCritical && !(product.active && stockStatus(product) !== "normal")) return false
        return !term || normalizeText(`${product.name} ${product.sku} ${product.ean}`).includes(term)
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }, [products, category, onlyCritical, query])

  function confirmRemove() {
    if (!removing) return
    const result = setProductActive(removing.id, false)
    setToast(
      result.ok
        ? { title: "Produto excluído", message: `${removing.name} foi inativado e mantido no histórico.`, tone: "info" }
        : { title: "Não foi possível excluir", message: result.error, tone: "error" },
    )
    setRemoving(null)
  }

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Produtos, categorias e movimentação da loja ativa."
        actions={
          <>
            <Button variant="outline" onClick={() => setManagingCategories(true)}>
              <List className="h-4 w-4" />
              Gerenciar Categorias
            </Button>
            <Button variant="accent" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              Adicionar Produto
            </Button>
          </>
        }
      />

      {(critical.length > 0 || fiscalLocked.length > 0) && (
        <div className="mt-8 flex flex-col gap-3">
          {critical.length > 0 && (
            <AlertBanner
              title="Alerta de Reposição"
              description="Existem itens com estoque crítico que precisam de atenção imediata."
              actionLabel={onlyCritical ? "Ver todos" : "Checklist"}
              onAction={() => setOnlyCritical((value) => !value)}
            />
          )}
          {fiscalLocked.length > 0 && (
            <AlertBanner
              tone="warning"
              title="Produto inativado pela trava fiscal"
              description={`${fiscalLocked[0].name}${fiscalLocked.length > 1 ? ` e mais ${fiscalLocked.length - 1}` : ""} ${fiscalLocked.length > 1 ? "foram salvos" : "foi salvo"} sem ${
                fiscalLocked[0].cfop.trim() ? "NCM" : "CFOP"
              } e ${fiscalLocked.length > 1 ? "estão inativos" : "está inativo"} enquanto a NFC-e estiver ligada.`}
              actionLabel="Corrigir"
              onAction={() => setEditing(fiscalLocked[0])}
            />
          )}
        </div>
      )}

      <div className="mb-5 mt-8 flex flex-wrap items-center gap-2.5">
        <button type="button" aria-pressed={showSearch} onClick={() => setShowSearch((value) => !value)} className={chip(true)}>
          <Filter className="h-4 w-4" />
          Filtros
        </button>
        <span className="mx-1.5 h-7 w-px bg-[var(--color-border)]" />
        {chips.map((item) => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={chip(category === item)}>
            {item}
          </button>
        ))}
      </div>

      {showSearch && (
        <div className="relative mb-5 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
          <Input aria-label="Buscar no estoque" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, SKU ou código de barras" className="pl-9" autoFocus />
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        {products.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-[var(--color-slate)]">Nenhum produto cadastrado. Toque em "Adicionar Produto" para começar.</p>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm font-semibold">Nenhum produto encontrado com esses filtros.</p>
        ) : (
          <Table>
            <caption className="sr-only">Produtos e saldo de estoque</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Produto</TableHead>
                <TableHead scope="col">SKU / Código</TableHead>
                <TableHead scope="col" className="text-right">
                  Custo / Venda
                </TableHead>
                <TableHead scope="col" className="text-center">
                  Qtd. atual
                </TableHead>
                <TableHead scope="col" className="text-center">
                  Status
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((product) => (
                <TableRow key={product.id} className={product.active ? "" : "opacity-70"}>
                  <TableCell>
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-paper-dim)] text-[var(--color-slate)]">
                        {product.image ? <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold">{product.name}</p>
                        <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-slate)]">
                          {product.category} · {product.unit}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-[var(--color-paper-dim)] px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-xs">{product.sku}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className="font-bold">{formatBRL(product.priceCents)}</p>
                    <p className="text-[13px] text-[#94a3b8]">{formatBRL(product.costCents)}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <strong className={`text-[22px] font-extrabold tabular-nums ${quantityTone(product)}`}>{formatQuantity(product.stock)}</strong>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusPill product={product} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex gap-1">
                      <button
                        type="button"
                        aria-label={`Registrar movimentação de ${product.name}`}
                        title="Entrada"
                        disabled={!product.active}
                        onClick={() => setMoving({ productId: product.id })}
                        className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)] disabled:opacity-40"
                      >
                        <ArrowDownToLine className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Editar ${product.name}`}
                        title="Editar"
                        onClick={() => setEditing(product)}
                        className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)]"
                      >
                        <Pencil className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${product.name}`}
                        title="Excluir"
                        disabled={!product.active}
                        onClick={() => setRemoving(product)}
                        className="rounded-lg p-2 text-[var(--color-alert)] transition hover:bg-[var(--color-alert-soft)] disabled:opacity-40"
                      >
                        <Trash2 className="h-[18px] w-[18px]" />
                      </button>
                    </span>
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
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">Histórico de movimentações</h2>
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
                    <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-slate)]">{movement.sku}</p>
                  </TableCell>
                  <TableCell>
                    <MovementBadge type={movement.type} />
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${movement.delta < 0 ? "text-[var(--color-alert-dark)]" : "text-[var(--color-stock-green)]"}`}>
                    {movement.delta > 0 ? `+${formatQuantity(movement.delta)}` : formatQuantity(movement.delta)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatQuantity(movement.balance)}</TableCell>
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

      {editing !== null && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null)
            setToast({ title: "Produto salvo", message, tone: "success" })
          }}
        />
      )}
      {moving !== null && (
        <MovementDialog
          initialProductId={moving.productId}
          onClose={() => setMoving(null)}
          onDone={(message) => {
            setMoving(null)
            setToast({ title: "Movimentação registrada", message, tone: "success" })
          }}
        />
      )}
      {managingCategories && <CategoriesDialog onClose={() => setManagingCategories(false)} />}

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing ? `Excluir ${removing.name}?` : "Excluir produto"}
        description="O produto tem histórico de movimentações e vendas, então é inativado (exclusão lógica): sai do PDV e continua nos relatórios. Para reativar, use Editar."
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setRemoving(null)}>
            Manter produto
          </Button>
          <Button onClick={confirmRemove}>Excluir produto</Button>
        </div>
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} message={toast?.message} tone={toast?.tone ?? "success"} onClose={closeToast} />
    </>
  )
}
