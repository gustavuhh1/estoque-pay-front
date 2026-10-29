/** Círculo verde com a inicial do nome (cliente, usuário). */
export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-green-100)] font-bold text-[var(--color-amber)]"
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  )
}
