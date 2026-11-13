/**
 * Pedido para o sininho recarregar logo, sem esperar o próximo polling. Disparado depois de ações que costumam gerar
 * notificação no servidor (venda, cancelamento, saída de estoque, fechamento de caixa, Pix confirmado).
 *
 * Mora num arquivo sem dependências para o cliente da API poder importá-lo sem ciclo.
 */
export const NOTIFICATIONS_REFRESH_EVENT = "estoquepay:notificacoes"

export function requestNotificationsRefresh() {
  window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT))
}

/** Rotas cujas escritas podem gerar notificação na API. */
const TRIGGER_PATHS = /^\/(pagamento|venda|estoque|caixa)(\/|$)/

export function isNotificationTrigger(method: string, path: string) {
  return method !== "GET" && TRIGGER_PATHS.test(path)
}
