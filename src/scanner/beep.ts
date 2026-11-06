let context: AudioContext | null = null

/** Bipe curto de confirmação, como no caixa do mercado: agudo quando achou, grave quando não achou. */
export function beep(kind: "ok" | "erro" = "ok") {
  try {
    context ??= new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    const duration = kind === "ok" ? 0.09 : 0.22
    oscillator.type = kind === "ok" ? "sine" : "square"
    oscillator.frequency.value = kind === "ok" ? 1760 : 220
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  } catch {
    // Sem áudio (navegador bloqueou ou não suporta): a leitura funciona igual, só sem som.
  }
}
