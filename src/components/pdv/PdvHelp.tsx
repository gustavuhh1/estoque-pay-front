import { Banknote, Barcode, Check, ChevronLeft, ChevronRight, MessageCircle, ShoppingCart, Trash2, type LucideIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

type Topic = { id: string; icon: LucideIcon; title: string; steps: string[] }

const TOPICS: Topic[] = [
  {
    id: "venda",
    icon: ShoppingCart,
    title: "Como fazer uma venda",
    steps: [
      "Bipe o código de barras do produto ou toque nele na tela.",
      "Confira os itens e as quantidades no carrinho, à direita.",
      "Toque no botão verde COBRAR.",
      "Escolha Pix, dinheiro ou cartão.",
      "Se o cliente quiser CPF na nota, digite o CPF.",
      "Confirme a venda e imprima o comprovante.",
    ],
  },
  {
    id: "cancelar",
    icon: Trash2,
    title: "Como cancelar uma venda",
    steps: [
      "Se a venda ainda não foi paga: toque em Limpar, no topo do carrinho.",
      "Se a venda já foi paga: abra o menu Vendas, toque na venda e depois em Cancelar.",
      "O cancelamento da nota só é aceito pela SEFAZ até 30 minutos depois da emissão.",
      "Depois desse prazo, faça a devolução pelo menu Vendas.",
    ],
  },
  {
    id: "leitor",
    icon: Barcode,
    title: "Como usar o leitor de código",
    steps: [
      "Deixe o cursor piscando na barra de busca do PDV.",
      "Aponte o leitor para o código de barras e aperte o gatilho.",
      "O produto entra no carrinho sozinho, com um apito.",
      "Se não entrar, digite o nome do produto na barra de busca.",
    ],
  },
  {
    id: "troco",
    icon: Banknote,
    title: "Como dar troco e fechar o caixa",
    steps: [
      "Na tela de pagamento, escolha Dinheiro.",
      "Digite quanto o cliente entregou no campo Valor recebido.",
      "O troco aparece calculado no quadro verde ao lado.",
      "No fim do dia, abra o Painel e toque em Fechar caixa para conferir o dinheiro.",
    ],
  },
  {
    id: "suporte",
    icon: MessageCircle,
    title: "Falar com o suporte",
    steps: [
      "Toque no botão abaixo para abrir o chat do EstoquePay.",
      "Atendimento de segunda a sábado, das 8h às 20h.",
      "Tenha o número da venda em mãos, se o problema for em uma venda.",
    ],
  },
]

/** Ajuda do PDV: lista de assuntos e passo a passo de cada um. */
export default function PdvHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [topic, setTopic] = useState<Topic | null>(null)

  const close = () => {
    setTopic(null)
    onClose()
  }

  if (topic) {
    return (
      <Dialog open={open} onClose={close} title={topic.title} widthClass="max-w-[520px]">
        <ol className="flex flex-col gap-3.5">
          {topic.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3.5">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[var(--color-green-100)] bg-[var(--color-stock-green-soft)] text-sm font-extrabold text-[var(--color-amber-dark)]">
                {index + 1}
              </span>
              <span className="pt-1 text-[15px] font-medium">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--color-border)] pt-5">
          <Button variant="outline" onClick={() => setTopic(null)}>
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button variant="accent" onClick={close}>
            {topic.id === "suporte" ? <MessageCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {topic.id === "suporte" ? "Abrir o chat" : "Entendi"}
          </Button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={close} title="Ajuda do PDV" description="Toque no assunto para ver o passo a passo" widthClass="max-w-[520px]">
      <div className="flex flex-col gap-2.5">
        {TOPICS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTopic(item)}
            className="flex min-h-16 items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white px-[18px] py-3 text-left shadow-xs transition hover:border-[var(--color-green-500)]/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-stock-green-soft)] text-[var(--color-amber-dark)]">
              <item.icon className="h-5 w-5" />
            </span>
            <strong className="flex-1 text-[15px]">{item.title}</strong>
            <ChevronRight className="h-5 w-5 text-[var(--color-slate)]" />
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-end border-t border-[var(--color-border)] pt-5">
        <Button variant="outline" onClick={close}>
          Fechar
        </Button>
      </div>
    </Dialog>
  )
}
