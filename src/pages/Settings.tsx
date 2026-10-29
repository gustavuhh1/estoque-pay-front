import { Building2, CreditCard, FileText, Users, type LucideIcon } from "lucide-react"
import { useState } from "react"
import { Navigate } from "react-router-dom"

import FiscalTab from "@/components/settings/FiscalTab"
import PlanSummary from "@/components/settings/PlanSummary"
import ProfileTab from "@/components/settings/ProfileTab"
import SubscriptionTab from "@/components/settings/SubscriptionTab"
import TeamTab from "@/components/settings/TeamTab"
import PageHeader from "@/components/PageHeader"
import { Toast, type ToastTone } from "@/components/ui/toast"
import { usePlan } from "@/billing/plan"
import { useAuth } from "@/auth/useAuth"
import type { Store } from "@/store/store-context"
import { useStores } from "@/store/useStores"
import { readMembers } from "@/team/team"

type TabId = "perfil" | "equipe" | "fiscal" | "plano"

const TABS: { id: TabId; label: string; icon: LucideIcon; ownerOnly?: boolean }[] = [
  { id: "perfil", label: "Perfil da empresa", icon: Building2 },
  { id: "equipe", label: "Equipe e acessos", icon: Users },
  { id: "fiscal", label: "Fiscal e NFC-e", icon: FileText },
  { id: "plano", label: "Assinatura", icon: CreditCard, ownerOnly: true },
]

function StoreSettings({ store }: { store: Store }) {
  const { session } = useAuth()
  const { subscription, limits, save } = usePlan()
  const self = { name: session?.user.name ?? "Usuário", email: session?.user.email ?? "" }
  const isOwner = store.role === "Owner"

  const initialMembers = readMembers(store.id, { ...self, role: store.role })
  const [tab, setTab] = useState<TabId>("perfil")
  const [memberInfo, setMemberInfo] = useState({ pending: initialMembers.filter((member) => member.status === "convite").length, total: initialMembers.length })
  const [toast, setToast] = useState<{ title: string; tone: ToastTone } | null>(null)

  const notify = (title: string, tone: ToastTone = "success") => setToast({ title, tone })
  const tabs = TABS.filter((item) => !item.ownerOnly || isOwner)

  return (
    <>
      <PageHeader title="Ajustes do Sistema" description="Gestão, segurança e auditoria da loja ativa." />

      <div role="tablist" aria-label="Seções de ajustes" className="mb-8 mt-8 flex flex-wrap gap-x-2 border-b border-[var(--color-border)]">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`-mb-px flex items-center gap-2.5 border-b-[3px] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.08em] transition ${
                active ? "border-[var(--color-amber)] text-[var(--color-amber)]" : "border-transparent text-[var(--color-slate)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "equipe" && memberInfo.pending > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-alert-soft)] px-1.5 text-[11px] font-bold text-[var(--color-alert)]">{memberInfo.pending}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          {tab === "perfil" && <ProfileTab store={store} onSaved={notify} />}
          {tab === "equipe" && (
            <TeamTab storeId={store.id} actor={store.role} self={self} limits={limits} onChange={setMemberInfo} onNotify={notify} />
          )}
          {tab === "fiscal" && <FiscalTab store={store} limits={limits} onNotify={notify} />}
          {tab === "plano" && isOwner && <SubscriptionTab subscription={subscription} isOwner={isOwner} onSave={save} onNotify={notify} />}
        </div>
        <PlanSummary subscription={subscription} limits={limits} members={memberInfo.total} />
      </div>

      <Toast open={toast !== null} title={toast?.title ?? ""} tone={toast?.tone ?? "success"} onClose={() => setToast(null)} />
    </>
  )
}

export default function SettingsPage() {
  const { activeStore } = useStores()
  // O Caixa (Colaborador) só opera o PDV: Ajustes não é para ele.
  if (activeStore.role === "Colaborador") return <Navigate to="/403" replace />
  return <StoreSettings key={activeStore.id} store={activeStore} />
}
