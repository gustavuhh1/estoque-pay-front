import { useRef, useState, type FormEvent } from "react"
import { Save, Trash2, Upload } from "lucide-react"

import googleIcon from "@/assets/brand/icone-google.svg"

import Avatar from "@/components/Avatar"
import Field from "@/components/Field"
import PageHeader from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { resizePhoto } from "@/profile/resizeImage"
import { useProfile } from "@/profile/useProfile"
import { maskCnpj } from "@/lib/format"
import { ROLE_LABEL, ROLE_TONE } from "@/team/team"

const card = "rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]"
const badge = "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em]"
const success = "border border-[var(--color-green-200)] bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]"
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

/** Meu perfil (RF01.7): dados pessoais, foto e as lojas da pessoa. Figma "09 — Meu perfil". */
export default function Profile() {
  const { profile, isLoading, error, save, setPhoto, applyGooglePhoto } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState<string | null>(null)
  const [nameError, setNameError] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [toast, setToast] = useState<{ title: string; tone: ToastTone } | null>(null)
  const notify = (title: string, tone: ToastTone = "success") => setToast({ title, tone })

  if (isLoading || !profile) {
    return (
      <>
        <PageHeader title="Meu perfil" description="Seus dados pessoais, a sua foto e as lojas em que você trabalha." />
        {error ? <p role="alert" className="mt-8 text-sm font-medium text-[var(--color-alert)]">{error}</p> : <Skeleton className="mt-8 h-80 rounded-2xl" />}
      </>
    )
  }

  const currentName = name ?? profile.name

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) {
    setBusy(true)
    const result = await action()
    setBusy(false)
    if (result.ok) notify(done)
    else notify(result.error, "error")
  }

  async function pickPhoto(file?: File) {
    if (!file) return
    try {
      const data = await resizePhoto(file)
      await run(() => setPhoto(data), "Foto atualizada.")
    } catch (e) {
      notify(e instanceof Error ? e.message : "Não foi possível usar esta imagem.", "error")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = currentName.trim()
    if (trimmed.length < 2) return setNameError("O nome precisa de pelo menos 2 caracteres.")
    setNameError("")
    await run(() => save({ name: trimmed }), "Dados pessoais salvos.")
    setName(null)
  }

  return (
    <>
      <PageHeader title="Meu perfil" description="Seus dados pessoais, a sua foto e as lojas em que você trabalha." />

      <div className="mt-8 grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className={card}>
          <form onSubmit={submit} noValidate>
            <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar name={profile.name || profile.email} src={profile.photo} size={96} />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{profile.name || "Sem nome"}</h2>
                <p className="truncate text-[15px] text-[var(--color-slate)]">{profile.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
                    <Upload />
                    Enviar foto
                  </Button>
                  {profile.googlePhotoAvailable && (
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run(applyGooglePhoto, "Foto do Google aplicada.")}>
                      <img src={googleIcon} alt="" width={16} height={16} />
                      Usar foto do Google
                    </Button>
                  )}
                  {profile.photo && (
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmRemove(true)}>
                      <Trash2 />
                      Remover foto
                    </Button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" data-testid="photo-input" onChange={(event) => void pickPhoto(event.target.files?.[0])} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="profile-person-name" label="Nome completo" error={nameError}>
                <Input
                  id="profile-person-name"
                  value={currentName}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "profile-person-name-msg" : undefined}
                />
              </Field>
              <Field id="profile-person-email" label="E-mail">
                <Input id="profile-person-email" value={profile.email} disabled readOnly className="font-[family-name:var(--font-mono)]" />
              </Field>
            </div>
            <p className="mt-3 text-[13px] text-[var(--color-slate)]">O e-mail é usado para entrar e não pode ser alterado aqui.</p>

            <div className="mt-6 flex justify-end">
              <Button type="submit" variant="accent" className="uppercase tracking-[0.08em]" disabled={busy}>
                <Save className="h-4 w-4" />
                Salvar alterações
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className={card}>
            <h2 className="text-xl font-bold">Minhas lojas</h2>
            <ul className="mt-4 flex flex-col gap-4">
              {profile.stores.map((store) => (
                <li key={store.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block truncate text-[15px]">{store.name}</strong>
                    {store.cnpj && <span className="block font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-slate)]">{maskCnpj(store.cnpj)}</span>}
                  </span>
                  <span className={`${badge} ${ROLE_TONE[store.role]}`}>{ROLE_LABEL[store.role]}</span>
                </li>
              ))}
              {profile.stores.length === 0 && <li className="text-[13px] text-[var(--color-slate)]">Você ainda não faz parte de nenhuma loja.</li>}
            </ul>
          </Card>

          <Card className={card}>
            <h2 className="text-xl font-bold">Formas de login</h2>
            <ul className="mt-4 flex flex-col gap-4">
              {profile.methods.includes("EMAIL") && (
                <li className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block text-[15px]">E-mail e senha</strong>
                    <span className="block truncate text-[13px] text-[var(--color-slate)]">{profile.email}</span>
                  </span>
                  <span className={`${badge} ${success}`}>Ativo</span>
                </li>
              )}
              {profile.methods.includes("GOOGLE") && (
                <li className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block text-[15px]">Google</strong>
                    <span className="block text-[13px] text-[var(--color-slate)]">Sem foto, a do Google é usada no login</span>
                  </span>
                  <span className={`${badge} ${success}`}>Vinculado</span>
                </li>
              )}
            </ul>
            {profile.createdAt !== null && <p className="mt-4 text-[13px] text-[var(--color-slate)]">Conta criada em {dateFormatter.format(profile.createdAt)}</p>}
          </Card>
        </div>
      </div>

      <Dialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover foto?"
        description={
          profile.methods.includes("GOOGLE")
            ? "A sua foto sai do perfil e da equipe e volta a aparecer a inicial do nome. No próximo login com o Google, a foto do Google passa a ser usada."
            : "A sua foto sai do perfil e da equipe e volta a aparecer a inicial do nome. Você pode enviar outra quando quiser."
        }
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirmRemove(false)}>
            Manter foto
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              setConfirmRemove(false)
              void run(() => setPhoto(null), "Foto removida.")
            }}
          >
            <Trash2 />
            Remover foto
          </Button>
        </div>
      </Dialog>

      <Toast open={toast !== null} title={toast?.title ?? ""} tone={toast?.tone ?? "success"} onClose={() => setToast(null)} />
    </>
  )
}
