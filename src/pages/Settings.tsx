import { useState, type FormEvent } from "react"
import { Building2, Save } from "lucide-react"

import Field from "@/components/Field"
import PageHeader from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Toast } from "@/components/ui/toast"
import { useAuth } from "@/auth/useAuth"
import { useStores } from "@/store/useStores"
import type { Store } from "@/store/store-context"

type StoreData = Omit<Store, "id" | "role">

const states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]

function StoreSettings({ store }: { store: Store }) {
  const { updateStore } = useStores()
  const { session, isBetterAuth } = useAuth()
  const [form, setForm] = useState<StoreData>(() => ({
    name: store.name,
    cnpj: store.cnpj,
    phone: store.phone,
    city: store.city,
    state: store.state,
  }))
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const update = (key: keyof StoreData) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    setError("")
    setSaved(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = {
      name: form.name.trim(),
      cnpj: form.cnpj.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      state: form.state,
    }
    if (next.name.length < 2) return setError("Informe o nome do estabelecimento.")
    if (!next.cnpj || !next.phone || !next.city || !next.state) return setError("Preencha todos os dados obrigatórios.")
    updateStore(store.id, next)
    setForm(next)
    setSaved(true)
    setError("")
  }

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Ajustes"
        description={<>Gerencie os dados de <strong className="font-semibold text-[var(--color-ink)]">{store.name}</strong> e consulte sua sessão.</>}
      />

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
        <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] sm:p-7">
          <div className="flex items-start gap-3 border-b border-[var(--color-border)] pb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-stock-green)]"><Building2 className="h-5 w-5" /></span>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">Dados do estabelecimento</h2>
              <p className="mt-1 text-sm text-[var(--color-slate)]">As alterações ficam salvas para a loja selecionada.</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <Field id="settings-store-name" label="Nome da loja">
              <Input id="settings-store-name" value={form.name} onChange={update("name")} minLength={2} autoComplete="organization" required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="settings-cnpj" label="CNPJ">
                <Input id="settings-cnpj" value={form.cnpj} onChange={update("cnpj")} inputMode="numeric" required />
              </Field>
              <Field id="settings-phone" label="Telefone">
                <Input id="settings-phone" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" required />
              </Field>
              <Field id="settings-city" label="Cidade">
                <Input id="settings-city" value={form.city} onChange={update("city")} autoComplete="address-level2" required />
              </Field>
              <Field id="settings-state" label="Estado">
                <Select id="settings-state" value={form.state} onChange={update("state")} autoComplete="address-level1" required>
                  {states.map((state) => <option key={state} value={state}>{state}</option>)}
                </Select>
              </Field>
            </div>
            {error && <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert)]">{error}</p>}
            <div className="flex justify-end border-t border-[var(--color-border)] pt-5">
              <Button type="submit" variant="accent"><Save className="h-4 w-4" />Salvar alterações</Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_10px_35px_rgba(13,28,46,0.05)] sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">Conta e acesso</h2>
          <p className="mt-1 text-sm text-[var(--color-slate)]">Informações da sessão atual.</p>
          <dl className="mt-5 divide-y divide-[var(--color-border)]">
            <div className="py-3">
              <dt className="text-xs text-[var(--color-slate)]">Nome</dt>
              <dd className="mt-1 text-sm font-semibold">{session?.user.name ?? "Usuário"}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-[var(--color-slate)]">E-mail</dt>
              <dd className="mt-1 break-all text-sm font-semibold">{session?.user.email ?? "—"}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-[var(--color-slate)]">Autenticação</dt>
              <dd className="mt-1 text-sm font-semibold">{isBetterAuth ? "Better Auth" : "Modo demonstração"}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-[var(--color-slate)]">Perfil na loja</dt>
              <dd className="mt-1 text-sm font-semibold">{store.role}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Toast
        open={saved}
        title="Dados da loja atualizados"
        message="As informações foram salvas neste navegador."
        tone="success"
        onClose={() => setSaved(false)}
      />
    </>
  )
}

export default function SettingsPage() {
  const { activeStore } = useStores()
  return <StoreSettings key={activeStore.id} store={activeStore} />
}
