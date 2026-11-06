import { Pencil, UserMinus, UserPlus } from "lucide-react"
import { useState, type FormEvent } from "react"

import Avatar from "@/components/Avatar"
import Field from "@/components/Field"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Limits } from "@/billing/plan"
import { formatBirthDate } from "@/lib/format"
import type { StoreRole } from "@/store/store-context"
import { config } from "@/config"
import { ROLE_LABEL, ROLE_TONE, assignableRoles, canManageMember, checkChangeRole, checkRemove, type Member } from "@/team/team"
import type { Team } from "@/team/useTeam"

type TeamTabProps = {
  team: Team
  actor: StoreRole
  self: { name: string; email: string }
  limits: Limits
  onNotify: (message: string, tone?: "success" | "error" | "info") => void
}

const iso = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10)

export default function TeamTab({ team, actor, self, limits, onNotify }: TeamTabProps) {
  const { members } = team
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)
  const [error, setError] = useState("")

  const roles = assignableRoles(actor)
  const atLimit = limits.maxMembers !== null && members.length >= limits.maxMembers

  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "").trim().toLowerCase()
    const name = String(form.get("name") ?? "").trim()
    const role = String(form.get("role")) as StoreRole
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setError("Informe um e-mail válido.")
    if (members.some((member) => member.email.toLowerCase() === email)) return setError("Este e-mail já faz parte da equipe.")
    if (!roles.includes(role)) return setError("Um Gestor só pode atribuir o cargo Caixa.")
    if (atLimit) return setError(`O plano Free permite até ${limits.maxMembers} membros (contando o Owner). Assine o Premium para adicionar mais.`)
    const result = await team.add({ name, email, role })
    if (!result.ok) return setError(result.error)
    setAdding(false)
    setError("")
    onNotify(`Convite enviado para ${email}.`)
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const role = String(new FormData(event.currentTarget).get("role")) as StoreRole
    const check = checkChangeRole(members, editing, role, actor, self.email)
    if (!check.ok) return setError(check.error)
    const target = editing
    const result = await team.changeRole(target.id, role)
    if (!result.ok) return setError(result.error)
    setEditing(null)
    setError("")
    onNotify(`Cargo de ${target.name} atualizado.`)
  }

  async function remove() {
    if (!removing) return
    const check = checkRemove(members, removing, actor, self.email)
    if (!check.ok) return setError(check.error)
    const target = removing
    const result = await team.remove(target.id)
    if (!result.ok) return setError(result.error)
    setRemoving(null)
    setError("")
    onNotify(`${target.name} perdeu o acesso à loja.`)
  }

  return (
    <Card className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6 shadow-[0_10px_35px_rgba(13,28,46,0.05)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Equipe e acessos</h2>
        <Button
          size="sm"
          variant="accent"
          onClick={() => {
            setError("")
            setAdding(true)
          }}
          disabled={roles.length === 0}
        >
          <UserPlus className="h-4 w-4" />
          Adicionar membro
        </Button>
      </div>

      <Table>
        <caption className="sr-only">Membros da equipe</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">Membro</TableHead>
            <TableHead scope="col" className="hidden sm:table-cell">
              Cargo
            </TableHead>
            <TableHead scope="col" className="hidden text-center md:table-cell">
              Vinculado em
            </TableHead>
            <TableHead scope="col" className="text-right">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            // Na API o convite pendente não tem rota de edição nem de remoção.
            const manageable = canManageMember(actor, member) && !(config.useApi && member.status === "convite")
            // Ninguém altera o próprio cargo nem se remove da equipe: a linha de quem está logado fica sem ações.
            const isSelf = member.email.toLowerCase() === self.email.toLowerCase()
            return (
              <TableRow key={member.id} className="h-[76px]">
                <TableCell className="w-full max-w-0 sm:w-auto sm:max-w-none">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={member.name} src={member.photo} />
                    <span className="flex min-w-0 flex-col">
                      <strong className="truncate text-[15px]">{member.name}</strong>
                      <span className="max-w-[190px] truncate text-[13px] text-[#94a3b8]">{member.email}</span>
                      {/* No celular o cargo vem aqui, no lugar da coluna. */}
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${ROLE_TONE[member.role]}`}>{ROLE_LABEL[member.role]}</span>
                        {member.status === "convite" && <span className="text-[10px] font-bold uppercase text-[var(--color-warn)]">Convite pendente</span>}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${ROLE_TONE[member.role]}`}>{ROLE_LABEL[member.role]}</span>
                  {member.status === "convite" && <span className="ml-2 text-[11px] font-bold uppercase text-[var(--color-warn)]">Convite pendente</span>}
                </TableCell>
                <TableCell className="hidden text-center font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-slate)] md:table-cell">{formatBirthDate(iso(member.linkedAt))}</TableCell>
                <TableCell className="text-right">
                  {isSelf ? (
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-amber)]">Você</span>
                  ) : (
                  <span className="inline-flex gap-1">
                    <button
                      type="button"
                      aria-label={`Editar cargo de ${member.name}`}
                      title={manageable ? "Editar cargo" : "Sem permissão para editar este membro"}
                      disabled={!manageable}
                      onClick={() => {
                        setError("")
                        setEditing(member)
                      }}
                      className="rounded-lg p-2 text-[var(--color-slate)] transition hover:bg-[var(--color-paper-dim)] hover:text-[var(--color-ink)] disabled:opacity-40"
                    >
                      <Pencil className="h-[18px] w-[18px]" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Desvincular ${member.name}`}
                      title={manageable ? "Desvincular" : "Sem permissão para desvincular este membro"}
                      disabled={!manageable}
                      onClick={() => {
                        setError("")
                        setRemoving(member)
                      }}
                      className="rounded-lg p-2 text-[var(--color-alert)] transition hover:bg-[var(--color-alert-soft)] disabled:opacity-40"
                    >
                      <UserMinus className="h-[18px] w-[18px]" />
                    </button>
                  </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className="mt-4 text-[13px] text-[var(--color-slate)]">Um Gestor não pode editar, rebaixar ou excluir um Owner, e a loja nunca pode ficar sem Owner.</p>
      {limits.maxMembers !== null && (
        <p className="mt-1 text-[13px] text-[var(--color-slate)]">
          Plano Free: {members.length} de {limits.maxMembers} membros (contando o Owner).
        </p>
      )}

      {adding && (
        <Dialog open onClose={() => setAdding(false)} title="Adicionar membro" description="Se o e-mail ainda não tem conta, a pessoa recebe um convite e ganha acesso ao criar a conta." widthClass="max-w-[480px]">
          <form onSubmit={sendInvite} noValidate className="space-y-4">
            <Field id="member-email" label="E-mail">
              <Input id="member-email" name="email" type="email" autoFocus placeholder="pessoa@empresa.com" />
            </Field>
            <Field id="member-name" label="Nome (opcional)">
              <Input id="member-name" name="name" placeholder="Ex: Ana Lima" />
            </Field>
            <Field id="member-role" label="Cargo">
              <Select id="member-role" name="role" defaultValue={roles.includes("Colaborador") ? "Colaborador" : roles[0]}>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </Select>
            </Field>
            {error && (
              <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent">
                Enviar convite
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {editing && (
        <Dialog open onClose={() => setEditing(null)} title={`Editar cargo de ${editing.name}`} widthClass="max-w-[440px]">
          <form onSubmit={saveRole} noValidate className="space-y-4">
            <Field id="edit-role" label="Cargo">
              <Select id="edit-role" name="role" defaultValue={editing.role}>
                {(["Owner", "Gestor", "Colaborador"] as StoreRole[])
                  .filter((role) => roles.includes(role) || role === editing.role)
                  .map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
              </Select>
            </Field>
            {error && (
              <p role="alert" className="rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="accent">
                Salvar cargo
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title={removing ? `Desvincular ${removing.name}?` : "Desvincular"} description="A pessoa perde o acesso a esta loja imediatamente.">
        {error && removing && (
          <p role="alert" className="mb-4 rounded-xl bg-[var(--color-alert-soft)] px-3 py-2 text-xs font-medium text-[var(--color-alert-dark)]">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setRemoving(null)}>
            Manter na equipe
          </Button>
          <Button onClick={remove}>Desvincular</Button>
        </div>
      </Dialog>
    </Card>
  )
}
