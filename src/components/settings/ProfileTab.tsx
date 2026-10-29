import { Save, Upload } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"

import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { config } from "@/config"
import { errorMessage } from "@/lib/api"
import { digitsOf, maskCnpj, maskPhone } from "@/lib/format"
import type { Store } from "@/store/store-context"
import { useStores } from "@/store/useStores"

const STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]
const MAX_LOGO_BYTES = 150 * 1024
const mono = "font-[family-name:var(--font-mono)]"

type Errors = Partial<Record<"name" | "cnpj" | "phone" | "city" | "logo", string>>

export default function ProfileTab({ store, onSaved }: { store: Store; onSaved: (message: string, tone?: "success" | "error") => void }) {
  const { updateStore } = useStores()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(store.name)
  const [cnpj, setCnpj] = useState(store.cnpj)
  const [ie, setIe] = useState(store.ie ?? "")
  const [phone, setPhone] = useState(store.phone ?? "")
  const [address, setAddress] = useState(store.address ?? "")
  const [city, setCity] = useState(store.city ?? "")
  const [state, setState] = useState(store.state ?? "CE")
  const [logo, setLogo] = useState(store.logo ?? "")
  const [errors, setErrors] = useState<Errors>({})

  const clear = (key: keyof Errors) => setErrors((current) => ({ ...current, [key]: undefined }))
  const aria = (key: keyof Errors) => ({ "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `profile-${key}-msg` : undefined })

  function pickLogo(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) return setErrors((current) => ({ ...current, logo: "Escolha um arquivo de imagem (PNG, JPG ou SVG)." }))
    if (file.size > MAX_LOGO_BYTES) return setErrors((current) => ({ ...current, logo: "A imagem deve ter até 150 KB." }))
    const reader = new FileReader()
    reader.onload = () => {
      setLogo(String(reader.result))
      clear("logo")
    }
    reader.readAsDataURL(file)
  }

  // Com a API só nome, CNPJ e inscrição estadual são guardados; logo, telefone, endereço e cidade são do modo demonstração.
  const local = !config.useApi

  async function submit(event: FormEvent) {
    event.preventDefault()
    const found: Errors = {}
    if (name.trim().length < 2) found.name = "Informe o nome fantasia."
    if (digitsOf(cnpj).length !== 14) found.cnpj = "O CNPJ deve ter 14 dígitos."
    if (local && digitsOf(phone).length < 10) found.phone = "Informe o telefone com DDD."
    if (local && !city.trim()) found.city = "Informe a cidade."
    setErrors(found)
    if (Object.keys(found).length > 0) return
    // updateStore faz merge: só os campos informados mudam.
    try {
      await updateStore(
        store.id,
        local ? { name: name.trim(), cnpj, phone, city: city.trim(), state, ie: ie.trim(), address: address.trim(), logo: logo || undefined } : { name: name.trim(), cnpj, ie: ie.trim() },
      )
      onSaved("Dados da empresa salvos.")
    } catch (error) {
      onSaved(errorMessage(error), "error")
    }
  }

  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <form onSubmit={submit} noValidate>
        {local && (
        <div className="mb-6 flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Alterar logo"
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-slate)] transition hover:border-[var(--color-green-500)]"
          >
            {logo ? (
              <img src={logo} alt="Logo da loja" className="h-full w-full object-contain" />
            ) : (
              <>
                <Upload className="h-[22px] w-[22px]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Alterar logo</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="logo-input" onChange={(event) => pickLogo(event.target.files?.[0])} />
          <div>
            <h2 className="mb-1 text-xl font-bold">Identidade Visual</h2>
            <p className="text-[15px] text-[var(--color-slate)]">Este logo aparecerá nos seus comprovantes de venda e relatórios oficiais.</p>
            {errors.logo && (
              <p id="profile-logo-msg" role="alert" className="mt-1 text-xs font-medium text-[var(--color-alert-dark)]">
                {errors.logo}
              </p>
            )}
            {logo && (
              <button type="button" onClick={() => setLogo("")} className="mt-1 text-xs font-bold text-[var(--color-alert)] hover:underline">
                Remover logo
              </button>
            )}
          </div>
        </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="profile-name" label="Nome fantasia" error={errors.name}>
            <Input id="profile-name" value={name} onChange={(event) => { setName(event.target.value); clear("name") }} autoComplete="organization" {...aria("name")} />
          </Field>
          <Field id="profile-cnpj" label="CNPJ / Identificação" error={errors.cnpj}>
            <Input id="profile-cnpj" value={cnpj} onChange={(event) => { setCnpj(maskCnpj(event.target.value)); clear("cnpj") }} inputMode="numeric" placeholder="00.000.000/0000-00" className={mono} {...aria("cnpj")} />
          </Field>
          <Field id="profile-ie" label="Inscrição estadual">
            <Input id="profile-ie" value={ie} onChange={(event) => setIe(event.target.value)} placeholder="082.114.550.119" className={mono} />
          </Field>
          {local && (
            <>
          <Field id="profile-phone" label="Telefone comercial" error={errors.phone}>
            <Input id="profile-phone" value={phone} onChange={(event) => { setPhone(maskPhone(event.target.value)); clear("phone") }} inputMode="tel" placeholder="(00) 0000-0000" className={mono} {...aria("phone")} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="profile-address" label="Endereço completo">
              <Input id="profile-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Rua, número, bairro" autoComplete="street-address" />
            </Field>
          </div>
          <Field id="profile-city" label="Cidade" error={errors.city}>
            <Input id="profile-city" value={city} onChange={(event) => { setCity(event.target.value); clear("city") }} {...aria("city")} />
          </Field>
          <Field id="profile-state" label="Estado">
            <Select id="profile-state" value={state} onChange={(event) => setState(event.target.value)}>
              {STATES.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </Select>
          </Field>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="accent" className="uppercase tracking-[0.08em]">
            <Save className="h-4 w-4" />
            Salvar alterações
          </Button>
        </div>
      </form>
    </Card>
  )
}
