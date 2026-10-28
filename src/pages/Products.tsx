import { PackageOpen, Pencil, Plus, Power, Search, TriangleAlert, Wallet } from "lucide-react"
import { useCallback, useMemo, useState, type FormEvent } from "react"

import Field from "@/components/Field"
import PageHeader from "@/components/PageHeader"
import StatCard from "@/components/StatCard"
import { StockBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Toast } from "@/components/ui/toast"
import { centsToInput, formatBRL, normalizeText } from "@/lib/format"
import { needsRestock, stockValueCents, validateProductForm, type ProductFormErrors, type RawProductForm } from "@/inventory/logic"
import { CATEGORIES, type Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { useStores } from "@/store/useStores"

const emptyForm: RawProductForm = { name: "", sku: "", category: CATEGORIES[0], price: "", cost: "", minStock: "5", stock: "0" }

const toForm = (product: Product): RawProductForm => ({
  name: product.name,
  sku: product.sku,
  category: product.category,
  price: centsToInput(product.priceCents),
  cost: product.costCents ? centsToInput(product.costCents) : "",
  minStock: String(product.minStock),
  stock: String(product.stock),
})

function ProductForm({ product, onDone, onCancel }: { product?: Product; onDone: (product: Product) => void; onCancel: () => void }) {
  const { products, createProduct, updateProduct } = useInventory()
  const [form, setForm] = useState<RawProductForm>(() => (product ? toForm(product) : emptyForm))
  const [errors, setErrors] = useState<ProductFormErrors>({})
  const [formError, setFormError] = useState("")

  const set = (key: keyof RawProductForm) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const aria = (key: keyof RawProductForm) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-msg` : undefined,
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    const { errors: found, input } = validateProductForm(form, products, { editingId: product?.id, requireStock: !product })
    setErrors(found)
    if (!input) return
    const result = product ? updateProduct(product.id, input) : createProduct(input)
    if (!result.ok) return setFormError(result.error)
    onDone(result.value)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field id="name" label="Nome do produto" error={errors.name}>
        <Input id="name" value={form.name} onChange={set("name")} placeholder="Ex.: Camiseta Básica P" autoFocus {...aria("name")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sku" label="SKU" error={errors.sku} hint="Código único do produto na loja.">
          <Input id="sku" value={form.sku} onChange={set("sku")} placeholder="CAM-007" className="font-mono uppercase" {...aria("sku")} />
        </Field>
        <Field id="category" label="Categoria" error={errors.category}>
          <Select id="category" value={form.category} onChange={set("category")} {...aria("category")}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </Select>
        </Field>
        <Field id="price" label="Preço de venda (R$)" error={errors.price}>
          <Input id="price" value={form.price} onChange={set("price")} inputMode="decimal" placeholder="129,90" {...aria("price")} />
        </Field>
        <Field id="cost" label="Custo (R$)" error={errors.cost} hint="Opcional. Usado no valor em estoque.">
          <Input id="cost" value={form.cost} onChange={set("cost")} inputMode="decimal" placeholder="58,00" {...aria("cost")} />
        </Field>
        <Field id="minStock" label="Estoque mínimo" error={errors.minStock} hint="Abaixo disso o item entra em alerta.">
          <Input id="minStock" value={form.minStock} onChange={set("minStock")} inputMode="numeric" {...aria("minStock")} />
        </Field>
        {product ? (
          <Field id="stock-readonly" label="Estoque atual" hint="Altere pela tela de Estoque, registrando a movimentação.">
            <Input id="stock-readonly" value={product.stock} readOnly disabled />
          </Field>
        ) : (
          <Field id="stock" label="Estoque inicial" error={errors.stock}>
            <Input id="stock" value={form.stock} onChange={set("stock")} inputMode="numeric" {...aria("stock")} />
          </Field>
        )}
      </div>

      {formError && (
        <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent">
          {product ? "Salvar alterações" : "Cadastrar produto"}
        </Button>
      </div>
    </form>
  )
}

export default function Products() {
  const { activeStore } = useStores()
  const { products, setProductActive } = useInventory()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("todas")
  const [status, setStatus] = useState("todos")
  const [editing, setEditing] = useState<Product | "new" | null>(null)
  const [toast, setToast] = useState<{ title: string; message?: string } | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const filtered = useMemo(() => {
    const term = normalizeText(query)
    return products
      .filter((product) => {
        if (term && !normalizeText(`${product.name} ${product.sku}`).includes(term)) return false
        if (category !== "todas" && product.category !== category) return false
        if (status === "ativos" && !product.active) return false
        if (status === "inativos" && product.active) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }, [products, query, category, status])

  const hasFilters = query !== "" || category !== "todas" || status !== "todos"
  const clearFilters = () => {
    setQuery("")
    setCategory("todas")
    setStatus("todos")
  }

  function toggleActive(product: Product) {
    const result = setProductActive(product.id, !product.active)
    if (result.ok) setToast({ title: product.active ? "Produto inativado" : "Produto reativado", message: product.name })
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description={
          <>
            Cadastre e mantenha o catálogo de <strong className="font-semibold text-[var(--color-ink)]">{activeStore.name}</strong>.
          </>
        }
        actions={
          <Button variant="accent" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        }
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Produtos ativos"
          value={String(products.filter((p) => p.active).length)}
          meta={`${products.length} no catálogo`}
          icon={PackageOpen}
        />
        <StatCard
          label="Valor em estoque (custo)"
          value={formatBRL(stockValueCents(products))}
          meta="Estoque atual × custo"
          icon={Wallet}
        />
        <StatCard
          label="Itens para repor"
          value={String(needsRestock(products).length)}
          meta="Abaixo do mínimo ou zerados"
          icon={TriangleAlert}
          alert={needsRestock(products).length > 0}
        />
      </section>

      <Card className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
        <div className="grid gap-3 border-b border-[var(--color-border)] p-4 sm:grid-cols-[1fr_200px_180px] sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
            <Input
              aria-label="Buscar produto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou SKU"
              className="pl-9"
            />
          </div>
          <Select aria-label="Filtrar por categoria" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="todas">Todas as categorias</option>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
          <Select aria-label="Filtrar por situação" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todas as situações</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </Select>
        </div>

        {products.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <PackageOpen className="mx-auto h-9 w-9 text-[var(--color-slate)]" />
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold">Nenhum produto cadastrado</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-slate)]">
              Cadastre o primeiro produto para começar a controlar estoque e registrar vendas.
            </p>
            <Button variant="accent" className="mt-6" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              Cadastrar primeiro produto
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold">Nenhum produto encontrado com esses filtros.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <caption className="sr-only">Lista de produtos da loja</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Produto</TableHead>
                <TableHead scope="col">Categoria</TableHead>
                <TableHead scope="col" className="text-right">
                  Preço
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Estoque
                </TableHead>
                <TableHead scope="col">Situação</TableHead>
                <TableHead scope="col" className="text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id} className={product.active ? "" : "opacity-60"}>
                  <TableCell>
                    <p className="font-semibold">{product.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--color-slate)]">{product.sku}</p>
                  </TableCell>
                  <TableCell className="text-[var(--color-slate)]">{product.category}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatBRL(product.priceCents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{product.stock}</TableCell>
                  <TableCell>
                    {product.active ? (
                      <StockBadge product={product} />
                    ) : (
                      <span className="inline-flex rounded-full bg-[var(--color-paper-dim)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-slate)]">
                        Inativo
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setEditing(product)} aria-label={`Editar ${product.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(product)}
                        aria-label={`${product.active ? "Inativar" : "Reativar"} ${product.name}`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {product.active ? "Inativar" : "Reativar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Novo produto" : "Editar produto"}
        description={editing === "new" ? "Preencha os dados para adicionar o produto ao catálogo." : "Atualize as informações do produto."}
      >
        {editing !== null && (
          <ProductForm
            key={editing === "new" ? "new" : editing.id}
            product={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onDone={(saved) => {
              setEditing(null)
              setToast({ title: editing === "new" ? "Produto cadastrado" : "Alterações salvas", message: saved.name })
            }}
          />
        )}
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} message={toast?.message} tone="success" onClose={closeToast} />
    </>
  )
}
