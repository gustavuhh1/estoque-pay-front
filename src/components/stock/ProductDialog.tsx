import { Save, ScanBarcode, TrendingDown, TrendingUp } from "lucide-react"
import { useState, type FormEvent } from "react"

import Field from "@/components/Field"
import ProductPhotoField from "@/components/stock/ProductPhotoField"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { centsToInput, formatBRL, formatQuantity, parseMoneyToCents } from "@/lib/format"
import { useBusy } from "@/lib/useBusy"
import { missingFiscal, validateProductForm, type ProductFormErrors, type RawProductForm } from "@/inventory/logic"
import type { Product } from "@/inventory/types"
import { useInventory } from "@/inventory/useInventory"
import { usePlan } from "@/billing/plan"
import { config } from "@/config"
import { beep } from "@/scanner/beep"
import { SCAN_PRIORITY, useBarcodeScanner } from "@/scanner/useBarcodeScanner"
import { useStores } from "@/store/useStores"

const mono = "font-[family-name:var(--font-mono)]"

const unitOptions = [
  { value: "UN", label: "Unidade" },
  { value: "KG", label: "Fracionado (kg)" },
  { value: "LT", label: "Fracionado (litro)" },
]

/** Lucro por unidade enquanto o dono digita custo e venda: verde com lucro, vermelho com prejuízo. */
function ProfitPreview({ cost, price }: { cost: string; price: string }) {
  const costCents = parseMoneyToCents(cost) ?? 0
  const priceCents = parseMoneyToCents(price) ?? 0
  const box = "sm:col-span-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"

  if (!costCents || !priceCents) {
    return (
      <div aria-live="polite" className={`${box} border-dashed border-[var(--color-border)] text-[var(--color-slate)]`}>
        <TrendingUp className="h-4 w-4 shrink-0" />
        Preencha o custo e o preço de venda para ver quanto você lucra em cada unidade.
      </div>
    )
  }

  const profit = priceCents - costCents
  // Margem sobre o preço de venda: de cada R$ 100 vendidos, quanto fica para a loja.
  const margin = Math.round((profit / priceCents) * 1000) / 10
  const loss = profit < 0

  return (
    <div
      aria-live="polite"
      className={`${box} ${loss ? "border-[var(--color-alert)]/25 bg-[var(--color-alert-soft)] text-[var(--color-alert-dark)]" : "border-[var(--color-amber)]/20 bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"}`}
    >
      {loss ? <TrendingDown className="h-5 w-5 shrink-0" /> : <TrendingUp className="h-5 w-5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {loss ? "Prejuízo de " : profit === 0 ? "Sem lucro: " : "Lucro de "}
          <span className={mono}>{formatBRL(Math.abs(profit))}</span> por unidade
        </p>
        <p className="text-xs opacity-80">
          {loss ? "O preço de venda está abaixo do custo. A trava anti-prejuízo vai bloquear essa venda." : `Margem de ${margin.toLocaleString("pt-BR")}% sobre o preço de venda.`}
        </p>
      </div>
    </div>
  )
}

const toForm = (product: Product | null, firstCategory: string, defaultCfop: string): RawProductForm =>
  product
    ? {
        name: product.name,
        ean: product.ean,
        unit: product.unit,
        category: product.category,
        cost: product.costCents ? centsToInput(product.costCents) : "",
        price: centsToInput(product.priceCents),
        ncm: product.ncm,
        cfop: product.cfop,
        minStock: formatQuantity(product.minStock),
        active: product.active,
      }
    : { name: "", ean: "", unit: "UN", category: firstCategory, cost: "", price: "", ncm: "", cfop: defaultCfop, minStock: "10", stock: "", active: true }

type ProductDialogProps = {
  /** Produto em edição, ou null para cadastrar um novo. */
  product: Product | null
  /** Código já lido pelo leitor (ex.: bipado no Estoque e não encontrado) para um produto novo. */
  initialEan?: string
  onClose: () => void
  onSaved: (message: string) => void
}

export default function ProductDialog({ product, initialEan = "", onClose, onSaved }: ProductDialogProps) {
  const { activeStore } = useStores()
  const { products, categories, createProduct, updateProduct } = useInventory()
  const { nfceOn: nfceEnabled, limits } = usePlan()

  const [form, setForm] = useState<RawProductForm>(() => ({ ...toForm(product, categories[0] ?? "", activeStore.cfopDefault ?? ""), ...(product ? {} : { ean: initialEan }) }))
  const [image, setImage] = useState<string | null>(product?.image ?? null)
  const [scannedAt, setScannedAt] = useState<number | null>(null)
  const [errors, setErrors] = useState<ProductFormErrors>({})
  const [formError, setFormError] = useState("")
  const { busy, run } = useBusy()
  // Na API o produto não precisa de categoria (o vínculo é opcional); no modo demonstração precisa.
  const categoryRequired = !config.useApi

  // Leitor de código de barras: com o diálogo aberto, a leitura vai para o campo EAN, esteja o foco onde estiver.
  useBarcodeScanner(
    (code) => {
      const taken = products.find((item) => item.ean === code && item.id !== product?.id)
      setForm((current) => ({ ...current, ean: code }))
      setErrors((current) => ({ ...current, ean: taken ? `Este código já está em uso em "${taken.name}".` : undefined }))
      setScannedAt(Date.now())
      beep(taken ? "erro" : "ok")
    },
    { priority: SCAN_PRIORITY.dialog },
  )

  const set = (key: Exclude<keyof RawProductForm, "active">) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const aria = (key: keyof ProductFormErrors) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${key}-msg` : undefined,
  })

  // Trava fiscal: com a NFC-e ligada, o produto sem NCM ou CFOP não pode ficar ativo.
  const locked = nfceEnabled && missingFiscal({ ncm: form.ncm.replace(/\D/g, ""), cfop: form.cfop })
  const categoryOptions = categories.includes(form.category) || !form.category ? categories : [form.category, ...categories]

  function submit(event: FormEvent) {
    event.preventDefault()
    const { errors: found, input, fiscalLocked, initialStock } = validateProductForm(form, products, {
      editingId: product?.id,
      sku: product?.sku,
      nfceEnabled,
      categoryOptional: !categoryRequired,
    })
    setErrors(found)
    if (!input) return
    // Plano Free: no máximo 50 produtos ativos (RN01). Vale para novo produto e para reativar.
    const activeCount = products.filter((item) => item.active).length
    const becomesActive = Boolean(input.active) && !product?.active
    if (limits.maxProducts !== null && becomesActive && activeCount >= limits.maxProducts)
      return setFormError(`O plano Free permite até ${limits.maxProducts} produtos ativos. Inative um produto ou assine o Premium.`)
    // Um envio por vez: o duplo clique cadastrava o mesmo produto duas vezes.
    // A foto só é enviada quando mudou (na edição, ausente = manter a atual).
    const photo = image !== (product?.image ?? null) ? { image } : {}
    void run(async () => {
      // O estoque inicial entra no histórico como "Estoque inicial" (a API grava a entrada junto com o produto).
      const result = await (product ? updateProduct(product.id, { ...input, ...photo }) : createProduct({ ...input, ...photo, stock: initialStock }))
      if (!result.ok) return setFormError(result.error)
      onSaved(
        fiscalLocked
          ? `${result.value.name} foi salvo sem NCM/CFOP e ficou inativo enquanto a NFC-e estiver ligada.`
          : `${result.value.name} ${product ? "atualizado" : "cadastrado"}.`,
      )
    })
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={product ? "Editar produto" : "Novo produto"}
      description={nfceEnabled ? "Campos com * são obrigatórios. Com a NFC-e ligada, NCM e CFOP também." : "Campos com * são obrigatórios."}
      widthClass="max-w-[640px]"
    >
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ProductPhotoField value={image} onChange={setImage} disabled={busy} />
          </div>
          <div className="sm:col-span-2">
            <Field id="name" label="Nome do produto" error={errors.name} required>
              <Input id="name" aria-required="true" value={form.name} onChange={set("name")} placeholder="Ex: Café Bourbon Special" autoFocus {...aria("name")} />
            </Field>
          </div>
          <Field id="ean" label="Código de barras (EAN/GTIN)" error={errors.ean} hint={errors.ean ? undefined : "Bipe o produto com o leitor para preencher."}>
            <div className="relative">
              <Input
                id="ean"
                value={form.ean}
                onChange={set("ean")}
                inputMode="numeric"
                placeholder="7891000315507"
                className={`${mono} pr-10 ${scannedAt && !errors.ean ? "search-item-enter border-[var(--color-green-500)] bg-[var(--color-stock-green-soft)]" : ""}`}
                {...aria("ean")}
              />
              <ScanBarcode className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-slate)]" />
            </div>
          </Field>
          <Field id="unit" label="Tipo de medida" error={errors.unit} required>
            <Select id="unit" aria-required="true" value={form.unit} onChange={set("unit")} {...aria("unit")}>
              {/* A API só tem unidade e quilo; o litro existe apenas no modo demonstração. */}
              {unitOptions.filter((option) => !config.useApi || option.value !== "LT").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          {/* No cadastro a categoria ocupa a linha toda e as duas quantidades ficam lado a lado. */}
          <div className={product ? "" : "sm:col-span-2"}>
            <Field id="category" label="Categoria" error={errors.category} required={categoryRequired}>
              <Select id="category" aria-required={categoryRequired} value={form.category} onChange={set("category")} {...aria("category")}>
                {(categoryOptions.length === 0 || config.useApi) && <option value="">{config.useApi ? "Sem categoria" : "Cadastre uma categoria"}</option>}
                {categoryOptions.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </Select>
            </Field>
          </div>
          {!product && (
            <Field id="stock" label="Estoque inicial" error={errors.stock} hint={errors.stock ? undefined : "O que já tem na loja. Entra no histórico como “Estoque inicial”."}>
              <div className="relative">
                <Input
                  id="stock"
                  value={form.stock ?? ""}
                  onChange={set("stock")}
                  inputMode={form.unit === "UN" ? "numeric" : "decimal"}
                  placeholder="0"
                  className={`${mono} pr-12`}
                  {...aria("stock")}
                />
                <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-[var(--color-slate)]">
                  {form.unit === "UN" ? "un" : form.unit.toLowerCase()}
                </span>
              </div>
            </Field>
          )}
          <Field id="minStock" label="Quantidade mínima" error={errors.minStock} hint={errors.minStock ? undefined : "Abaixo disso o produto entra em “para repor”."}>
            <Input id="minStock" value={form.minStock} onChange={set("minStock")} inputMode="decimal" placeholder="10" className={mono} {...aria("minStock")} />
          </Field>
          <Field id="cost" label="Preço de custo" error={errors.cost} help="Quanto você pagou por uma unidade do produto ao fornecedor. Com ele o sistema mostra seu lucro e impede vender no prejuízo.">

            <MoneyInput id="cost" value={form.cost} onValueChange={(value) => set("cost")({ target: { value } })} placeholder="0,00" {...aria("cost")} />
          </Field>
          <Field id="price" label="Preço de venda" error={errors.price} hint="A trava anti-prejuízo bloqueia venda abaixo do custo." required>
            <MoneyInput id="price" aria-required="true" value={form.price} onValueChange={(value) => set("price")({ target: { value } })} placeholder="0,00" {...aria("price")} />
          </Field>
          <ProfitPreview cost={form.cost} price={form.price} />
          <Field
            id="ncm"
            label="NCM"
            error={errors.ncm}
            required={nfceEnabled}
            help="É o “RG” do produto para a Receita: um código de 8 números que diz o que ele é (ex.: café torrado = 0901.21.00). Está na nota fiscal de compra do seu fornecedor; se não achar, peça ao seu contador."
          >
            <Input id="ncm" aria-required={nfceEnabled} value={form.ncm} onChange={set("ncm")} inputMode="numeric" placeholder="0901.21.00" className={mono} {...aria("ncm")} />
          </Field>
          <Field
            id="cfop"
            label="CFOP"
            error={errors.cfop}
            hint="5102 para venda dentro do estado."
            required={nfceEnabled}
            help="Código de 4 números que diz o tipo da venda na nota fiscal. Para quem revende produtos comprados de outros, vendendo ao consumidor no balcão, quase sempre é 5102. Na dúvida, confirme com seu contador."
          >
            <Input id="cfop" aria-required={nfceEnabled} value={form.cfop} onChange={set("cfop")} inputMode="numeric" placeholder="5102" className={mono} {...aria("cfop")} />
          </Field>
          <div className="sm:col-span-2">
            <Switch
              checked={form.active && !locked}
              onChange={(active) => setForm((current) => ({ ...current, active }))}
              disabled={locked}
              label="Produto ativo"
              description={locked ? "Preencha NCM e CFOP para ativar enquanto a NFC-e estiver ligada." : "Disponível para venda no PDV."}
            />
          </div>
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
            {formError}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="accent" disabled={busy}>
            <Save className="h-4 w-4" />
            {busy ? "Salvando…" : "Salvar produto"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
