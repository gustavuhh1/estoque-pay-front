import { DEMO_STORE_IDS } from "@/customers/demo"
import type { StoreRole } from "@/store/store-context"

export type Member = {
  id: string
  name: string
  email: string
  role: StoreRole
  linkedAt: number
  /** Convite pendente: o e-mail ainda não tem conta no EstoquePay. */
  status: "ativo" | "convite"
}

/** O cargo "Colaborador" aparece como "Caixa" na interface. */
export const ROLE_LABEL: Record<StoreRole, string> = { Owner: "Owner", Gestor: "Gestor", Colaborador: "Caixa" }

const key = (storeId: string) => `estoquepay.demo.team.${storeId}`
const date = (iso: string) => new Date(`${iso}T12:00:00`).getTime()

type Self = { name: string; email: string; role: StoreRole }

/** Equipe inicial: lojas de exemplo vêm com três pessoas; as demais, só o próprio usuário como Owner. */
function seed(storeId: string, self: Self): Member[] {
  const me = (linked: string): Member => ({ id: "self", name: self.name, email: self.email, role: self.role, linkedAt: date(linked), status: "ativo" })
  const ana: Member = { id: "seed-ana", name: "Ana Lima", email: "ana@estoquepay.com", role: "Gestor", linkedAt: date("2024-04-03"), status: "ativo" }
  const pedro: Member = { id: "seed-pedro", name: "Pedro Rocha", email: "pedro@estoquepay.com", role: "Colaborador", linkedAt: date("2024-06-19"), status: "ativo" }
  const marina: Member = { id: "seed-marina", name: "Marina Tavares", email: "marina@estoquepay.com", role: "Owner", linkedAt: date("2024-01-12"), status: "ativo" }
  if (!DEMO_STORE_IDS.has(storeId)) return [{ ...me(new Date().toISOString().slice(0, 10)), role: "Owner" }]
  if (self.role === "Owner") return [me("2024-01-12"), ana, pedro]
  if (self.role === "Gestor") return [marina, me("2024-04-03"), pedro]
  return [marina, ana, me("2024-06-19")]
}

export function readMembers(storeId: string, self: Self): Member[] {
  try {
    const raw = localStorage.getItem(key(storeId))
    if (raw === null) return seed(storeId, self)
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seed(storeId, self)
    return parsed.filter((member): member is Member => Boolean(member && typeof member.id === "string" && typeof member.email === "string" && typeof member.role === "string"))
  } catch {
    return seed(storeId, self)
  }
}

export function writeMembers(storeId: string, members: Member[]) {
  try {
    localStorage.setItem(key(storeId), JSON.stringify(members))
    return true
  } catch {
    return false
  }
}

// ---------- regras de permissão (RN02, RN03, RN06) ----------
/** Cargos que o ator pode atribuir: o Gestor só atribui Caixa. */
export function assignableRoles(actor: StoreRole): StoreRole[] {
  if (actor === "Owner") return ["Owner", "Gestor", "Colaborador"]
  if (actor === "Gestor") return ["Colaborador"]
  return []
}

/** Quem pode editar ou desvincular o membro: o Gestor não mexe em Owner nem em outro Gestor. */
export function canManageMember(actor: StoreRole, target: Member) {
  if (actor === "Owner") return true
  return actor === "Gestor" && target.role === "Colaborador"
}

type Check = { ok: true } | { ok: false; error: string }

export function checkChangeRole(members: Member[], target: Member, role: StoreRole, actor: StoreRole, selfEmail: string): Check {
  if (!canManageMember(actor, target)) return { ok: false, error: "Um Gestor não pode editar, rebaixar ou excluir um Owner." }
  if (!assignableRoles(actor).includes(role)) return { ok: false, error: "Um Gestor só pode atribuir o cargo Caixa." }
  if (target.email.toLowerCase() === selfEmail.toLowerCase() && role !== target.role) return { ok: false, error: "Você não pode alterar o próprio cargo." }
  if (target.role === "Owner" && role !== "Owner" && members.filter((member) => member.role === "Owner" && member.status === "ativo").length <= 1)
    return { ok: false, error: "A loja não pode ficar sem Owner." }
  return { ok: true }
}

export function checkRemove(members: Member[], target: Member, actor: StoreRole, selfEmail: string): Check {
  if (!canManageMember(actor, target)) return { ok: false, error: "Um Gestor não pode editar, rebaixar ou excluir um Owner." }
  if (target.email.toLowerCase() === selfEmail.toLowerCase()) return { ok: false, error: "Você não pode se desvincular da própria loja." }
  if (target.role === "Owner" && members.filter((member) => member.role === "Owner" && member.status === "ativo").length <= 1)
    return { ok: false, error: "A loja não pode ficar sem Owner." }
  return { ok: true }
}

/** Convite para um e-mail sem conta: o vínculo vale quando a pessoa criar a conta. */
export function createInvite(input: { name: string; email: string; role: StoreRole }): Member {
  return {
    id: `m-${Date.now().toString(36)}`,
    name: input.name || input.email.split("@")[0],
    email: input.email,
    role: input.role,
    linkedAt: Date.now(),
    status: "convite",
  }
}
