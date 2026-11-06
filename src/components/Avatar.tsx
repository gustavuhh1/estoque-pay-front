import { useState } from "react"

type AvatarProps = { name: string; size?: number; src?: string | null }

/** Foto da pessoa; sem foto (ou se ela não carregar), o círculo verde com a inicial do nome. */
export default function Avatar({ name, size = 40, src }: AvatarProps) {
  const [falhou, setFalhou] = useState<string | null>(null)
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (src && falhou !== src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        onError={() => setFalhou(src)}
        style={style}
        className="shrink-0 rounded-full bg-[var(--color-green-100)] object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-green-100)] font-bold text-[var(--color-amber)]"
    >
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  )
}
