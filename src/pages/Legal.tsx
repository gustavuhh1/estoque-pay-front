import { Link } from "react-router-dom"
import { ArrowLeft, Boxes, FileText, ShieldCheck } from "lucide-react"

import { BarcodeStrip } from "@/components/BarcodeStrip"

interface LegalProps {
  type: "terms" | "privacy"
}

const copy = {
  terms: {
    eyebrow: "Termos de Uso",
    title: "Regras claras para usar o EstoquePay.",
    icon: FileText,
    intro:
      "Esta tela faz parte do protótipo visual. O conteúdo definitivo pode ser revisado quando as regras do produto e a integração com o back-end forem fechadas.",
    sections: [
      ["Uso da plataforma", "O sistema foi pensado para organização de estoque, vendas e pagamentos. As informações apresentadas no protótipo são ilustrativas."],
      ["Conta e acesso", "O usuário deverá manter seus dados de acesso protegidos e utilizar a plataforma de acordo com as regras definidas pelo projeto."],
      ["Informações do sistema", "Recursos, planos e valores podem ser alterados durante a evolução do projeto acadêmico."],
    ],
  },
  privacy: {
    eyebrow: "Política de Privacidade",
    title: "Privacidade também faz parte da experiência.",
    icon: ShieldCheck,
    intro:
      "Esta tela organiza visualmente como uma futura política de privacidade pode ser apresentada ao usuário antes da integração real com o back-end.",
    sections: [
      ["Dados coletados", "O protótipo prevê dados básicos de conta e loja, mas ainda não realiza armazenamento real nesta etapa."],
      ["Uso das informações", "As informações deverão ser utilizadas apenas para as funcionalidades previstas pelo sistema e pelo contexto do projeto."],
      ["Atualizações", "Este documento poderá ser revisado quando autenticação, persistência e demais serviços forem conectados ao sistema."],
    ],
  },
}

export default function Legal({ type }: LegalProps) {
  const content = copy[type]
  const Icon = content.icon

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-ink)]/10 bg-white/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-ink)]">
              <Boxes className="h-5 w-5 text-[var(--color-amber)]" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold">EstoquePay</span>
          </Link>
          <Link to="/cadastro" className="text-xs font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)]">Voltar ao cadastro</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 md:py-20">
        <Link to="/cadastro" className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-slate)] hover:text-[var(--color-ink)]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>

        <div className="mt-8 rounded-2xl border border-[var(--color-ink)]/10 bg-white p-6 shadow-[0_16px_50px_rgba(27,42,74,0.07)] sm:p-8 md:p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-paper)]">
            <Icon className="h-5 w-5 text-[var(--color-ink)]" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber-dark)]">{content.eyebrow}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h1>
          <p className="mt-5 text-sm leading-7 text-[var(--color-slate)]">{content.intro}</p>

          <div className="mt-10 space-y-7">
            {content.sections.map(([title, text]) => (
              <section key={title} className="border-t border-[var(--color-ink)]/10 pt-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--color-slate)]">{text}</p>
              </section>
            ))}
          </div>

          <BarcodeStrip className="mt-10 rounded-b-lg opacity-25" />
        </div>
      </main>
    </div>
  )
}
