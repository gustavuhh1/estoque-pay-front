import { Check, Lock, ShieldCheck, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Limits } from "@/billing/plan"
import { api, errorMessage } from "@/lib/api"
import type { Store } from "@/store/store-context"
import { useStores } from "@/store/useStores"

type Pendencia = {
  codigo: "PLANO_NAO_PREMIUM" | "CERTIFICADO_A1_AUSENTE" | "IE_AUSENTE" | "PRODUTOS_SEM_NCM_CFOP"
  mensagem: string
  total_produtos?: number
  produtos?: { id: string; nome: string }[]
}
type PreCheck = { apto: boolean; plano: "FREE" | "PREMIUM"; emite_nfce: boolean; pendencias: Pendencia[] }

type FiscalTabApiProps = {
  store: Store
  limits: Limits
  onNotify: (message: string, tone?: "success" | "error" | "info") => void
}

/** Switch fiscal pela API: o pre-check do servidor diz o que falta antes de ligar a NFC-e simulada. */
export default function FiscalTabApi({ store, limits, onNotify }: FiscalTabApiProps) {
  const { reload } = useStores()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preCheck, setPreCheck] = useState<PreCheck | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [certificate, setCertificate] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const enabled = limits.nfce && Boolean(store.nfceEnabled)

  const refreshPreCheck = useCallback(async () => {
    try {
      setPreCheck(await api.get<PreCheck>("/estabelecimento/ativo/nfce/pre-check"))
      setLoadError(null)
    } catch (failure) {
      setLoadError(errorMessage(failure))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get<PreCheck>("/estabelecimento/ativo/nfce/pre-check").then(
      (data) => {
        if (cancelled) return
        setPreCheck(data)
        setLoadError(null)
      },
      (failure: unknown) => {
        if (!cancelled) setLoadError(errorMessage(failure))
      },
    )
    return () => {
      cancelled = true
    }
  }, [store.id])

  async function toggle(next: boolean) {
    setBusy(true)
    try {
      await api.patch("/estabelecimento/ativo/nfce", { emite_nfce: next })
      await reload()
      await refreshPreCheck()
      onNotify(next ? "NFC-e simulada ligada." : "NFC-e desligada.", next ? "success" : "info")
    } catch (failure) {
      onNotify(errorMessage(failure), "error")
      await refreshPreCheck()
    } finally {
      setBusy(false)
    }
  }

  async function saveCertificate() {
    if (!certificate) return onNotify("Escolha o arquivo do certificado A1.", "error")
    if (!password) return onNotify("Informe a senha do certificado.", "error")
    setBusy(true)
    try {
      // O arquivo em si não é enviado (emissão simulada): vão o nome do certificado e a senha, que a API exige juntos
      // e nunca devolve. A senha não fica guardada no navegador.
      await api.patch("/estabelecimento/ativo", { certificado_a1: certificate, certificado_a1_senha: password })
      setPassword("")
      await refreshPreCheck()
      onNotify("Certificado informado.")
    } catch (failure) {
      onNotify(errorMessage(failure), "error")
    } finally {
      setBusy(false)
    }
  }

  const pending = preCheck?.pendencias ?? []
  const has = (code: Pendencia["codigo"]) => pending.some((item) => item.codigo === code)
  const checklist = [
    { label: "Plano Premium ativo", ok: preCheck ? !has("PLANO_NAO_PREMIUM") : false },
    { label: "Inscrição estadual informada (Perfil da empresa)", ok: preCheck ? !has("IE_AUSENTE") : false },
    { label: "Certificado digital A1 informado", ok: preCheck ? !has("CERTIFICADO_A1_AUSENTE") : false },
    { label: "Todos os produtos ativos com NCM e CFOP", ok: preCheck ? !has("PRODUTOS_SEM_NCM_CFOP") : false },
  ]
  const products = pending.find((item) => item.codigo === "PRODUTOS_SEM_NCM_CFOP")

  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <h2 className="mb-4 text-xl font-bold">Emissão de NFC-e</h2>
      <Switch
        checked={enabled}
        onChange={(next) => void toggle(next)}
        disabled={busy || (!enabled && !preCheck?.apto)}
        label="Emitir NFC-e automaticamente após o pagamento"
        description="Com a chave ligada, NCM e CFOP passam a ser obrigatórios em todo produto ativo."
      />

      {!limits.premium && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--color-warn-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--color-warn)]">
          <Lock className="h-4 w-4" />A NFC-e é exclusiva do plano Premium. No Free ela fica desligada.
        </p>
      )}

      {loadError && (
        <p role="alert" className="mt-3 rounded-xl bg-[var(--color-alert-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--color-alert-dark)]">
          {loadError}
        </p>
      )}

      {!enabled && (
        <ul className="mt-4 space-y-1.5 rounded-xl bg-[var(--color-paper)] px-4 py-3" aria-label="Pré-check da NFC-e">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              {item.ok ? <Check className="h-4 w-4 text-[var(--color-amber)]" /> : <X className="h-4 w-4 text-[var(--color-alert)]" />}
              <span className={item.ok ? "" : "font-semibold text-[var(--color-alert-dark)]"}>{item.label}</span>
            </li>
          ))}
        </ul>
      )}

      {products && (
        <div className="mt-3 rounded-xl bg-[var(--color-warn-soft)] px-4 py-3 text-sm text-[var(--color-warn)]">
          <p className="font-bold">{products.mensagem}</p>
          {products.produtos && products.produtos.length > 0 && (
            <p className="mt-1">
              {products.produtos.slice(0, 5).map((item) => item.nome).join(", ")}
              {(products.total_produtos ?? 0) > 5 ? ` e mais ${(products.total_produtos ?? 0) - 5}` : ""}.{" "}
              <Link to="/estoque" className="font-bold underline">
                Corrigir no Estoque
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <Field id="fiscal-cert" label="Certificado digital A1" hint="Simulação: o arquivo não é enviado, só o nome dele.">
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
        <Field id="fiscal-password" label="Senha do certificado" hint="Enviada só ao servidor, que a exige para o pré-check. Não fica salva neste navegador.">
          <Input id="fiscal-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" placeholder="••••••••" />
        </Field>
        <Field id="fiscal-partner" label="API parceira" hint="A emissão real está fora do escopo do projeto: as notas são simuladas.">
          <Select id="fiscal-partner" value="simulacao" disabled onChange={() => {}}>
            <option value="simulacao">Simulação (sem emissão real)</option>
          </Select>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button variant="accent" onClick={() => void saveCertificate()} disabled={busy || !certificate || !password}>
          Salvar certificado
        </Button>
      </div>
    </Card>
  )
}
