import { Check, Lock, ShieldCheck, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import AlertBanner from "@/components/AlertBanner"
import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Limits } from "@/billing/plan"
import { digitsOf } from "@/lib/format"
import { missingFiscal } from "@/inventory/logic"
import { useInventory } from "@/inventory/useInventory"
import type { Store } from "@/store/store-context"
import { useStores } from "@/store/useStores"

type FiscalTabProps = {
  store: Store
  limits: Limits
  onNotify: (message: string, tone?: "success" | "error" | "info") => void
}

export default function FiscalTab({ store, limits, onNotify }: FiscalTabProps) {
  const { updateStore } = useStores()
  const { products, setProductActive } = useInventory()
  const fileRef = useRef<HTMLInputElement>(null)
  const [certificate, setCertificate] = useState(store.certificateName ?? "")
  const [password, setPassword] = useState("")
  const [cfop, setCfop] = useState(store.cfopDefault ?? "5102")
  const [error, setError] = useState("")

  const enabled = limits.nfce && (store.nfceEnabled ?? true)
  const savedCertificate = Boolean(store.certificateName)

  // Pré-check: tudo isso precisa estar pronto para ligar a emissão.
  const checks = [
    { label: "Plano Premium ativo", ok: limits.premium },
    { label: "CNPJ informado no perfil da empresa", ok: digitsOf(store.cnpj).length === 14 },
    { label: "Inscrição estadual informada", ok: Boolean(store.ie?.trim()) },
    { label: "Certificado digital A1 informado", ok: savedCertificate },
  ]
  const ready = checks.every((check) => check.ok)

  const lockedProducts = useMemo(() => products.filter((product) => !product.active && missingFiscal(product)), [products])
  const toFix = useMemo(() => products.filter((product) => product.active && missingFiscal(product)), [products])

  const save = () => {
    if (!/^\d{4}$/.test(cfop.trim())) return setError("O CFOP tem 4 dígitos (ex.: 5102).")
    updateStore(store.id, { name: store.name, cnpj: store.cnpj, phone: store.phone, city: store.city, state: store.state, cfopDefault: cfop.trim(), certificateName: certificate || undefined })
    setPassword("") // a senha nunca é guardada
    setError("")
    onNotify("Configurações fiscais salvas.")
  }

  function toggle(next: boolean) {
    if (next) {
      if (!ready) return
      // RN09: ao ligar a NFC-e, produto ativo sem NCM/CFOP é inativado automaticamente.
      for (const product of toFix) setProductActive(product.id, false)
      updateStore(store.id, { name: store.name, cnpj: store.cnpj, phone: store.phone, city: store.city, state: store.state, nfceEnabled: true })
      onNotify(toFix.length > 0 ? `NFC-e ligada. ${toFix.length} produto(s) sem NCM/CFOP foram inativados.` : "NFC-e ligada.")
    } else {
      updateStore(store.id, { name: store.name, cnpj: store.cnpj, phone: store.phone, city: store.city, state: store.state, nfceEnabled: false })
      onNotify("NFC-e desligada.", "info")
    }
  }

  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <h2 className="mb-4 text-xl font-bold">Emissão de NFC-e</h2>
      <Switch
        checked={enabled}
        onChange={toggle}
        disabled={!enabled && !ready}
        label="Emitir NFC-e automaticamente após o pagamento"
        description="Com a chave ligada, NCM e CFOP passam a ser obrigatórios em todo produto ativo."
      />

      {!limits.premium && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-warn-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--color-warn)]">
          <Lock className="h-4 w-4" />A NFC-e é exclusiva do plano Premium. No Free ela fica desligada.
        </p>
      )}

      {!enabled && (
        <ul className="mt-4 space-y-1.5 rounded-xl bg-[var(--color-paper)] px-4 py-3" aria-label="Pré-check da NFC-e">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2 text-sm">
              {check.ok ? <Check className="h-4 w-4 text-[var(--color-amber)]" /> : <X className="h-4 w-4 text-[var(--color-alert)]" />}
              <span className={check.ok ? "" : "font-semibold text-[var(--color-alert-dark)]"}>{check.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <Field id="fiscal-cert" label="Certificado digital A1" hint="Simulação: só o nome do arquivo fica salvo. O certificado não é enviado nem armazenado.">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-11 w-full items-center gap-2.5 rounded-md border border-[var(--color-ink)]/15 bg-white px-3.5 text-left text-sm transition hover:border-[var(--color-green-500)]"
          >
            <ShieldCheck className="h-4 w-4 text-[var(--color-slate)]" />
            <span className={certificate ? "" : "text-[var(--color-slate)]/70"}>{certificate || "Selecionar arquivo .pfx"}</span>
          </button>
          <input ref={fileRef} id="fiscal-cert" type="file" accept=".pfx,.p12" className="hidden" data-testid="cert-input" onChange={(event) => setCertificate(event.target.files?.[0]?.name ?? certificate)} />
        </Field>
        <Field id="fiscal-password" label="Senha do certificado">
          <Input id="fiscal-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" placeholder="••••••••" />
        </Field>
        <Field id="fiscal-cfop" label="CFOP padrão" error={error || undefined} hint="5102 cobre 99% das vendas dentro do estado.">
          <Input
            id="fiscal-cfop"
            value={cfop}
            onChange={(event) => {
              setCfop(event.target.value.replace(/\D/g, "").slice(0, 4))
              setError("")
            }}
            inputMode="numeric"
            className="font-[family-name:var(--font-mono)]"
          />
        </Field>
        <Field id="fiscal-partner" label="API parceira" hint="A emissão real está fora do escopo do projeto: as notas são simuladas.">
          <Select id="fiscal-partner" value="simulacao" disabled onChange={() => {}}>
            <option value="simulacao">Simulação (sem emissão real)</option>
          </Select>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button variant="accent" onClick={save}>
          Salvar configurações fiscais
        </Button>
      </div>

      {enabled && lockedProducts.length > 0 && (
        <div className="mt-6">
          <AlertBanner
            tone="warning"
            title={`${lockedProducts.length} ${lockedProducts.length === 1 ? "produto" : "produtos"} sem NCM/CFOP`}
            description={`${lockedProducts[0].name}${lockedProducts.length > 1 ? ` e mais ${lockedProducts.length - 1}` : ""} ${lockedProducts.length > 1 ? "foram inativados" : "foi inativado"} automaticamente pela trava de conformidade.`}
          />
          <Link to="/estoque" className="mt-2 inline-block text-sm font-bold text-[var(--color-warn)] hover:underline">
            Ver produtos no Estoque
          </Link>
        </div>
      )}
    </Card>
  )
}
