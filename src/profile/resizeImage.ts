/** Mesmo limite da API (~100 KB de imagem em base64). */
export const MAX_PHOTO_CHARS = 140_000
const SIZE = 256
/** A imagem é redesenhada num canvas e sempre sai como WebP/JPEG, então dá para aceitar GIF, BMP e AVIF também. */
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/avif"]
/** Valor pronto para o `accept` do <input type="file">. */
export const PHOTO_ACCEPT = ACCEPTED.join(",")

/**
 * Corta a foto no centro (quadrado), reduz para 256 px e devolve um data URI pequeno o bastante para a API.
 * Tenta WebP e cai para JPEG se o navegador não gerar WebP; baixa a qualidade até caber no limite.
 */
export async function resizePhoto(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Use uma imagem PNG, JPEG, WebP ou GIF.")
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Não foi possível abrir esta imagem. Tente outra (PNG ou JPEG).")
  })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement("canvas")
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.")
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()

  for (const type of ["image/webp", "image/jpeg"]) {
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const data = canvas.toDataURL(type, quality)
      // Sem suporte ao tipo, o navegador devolve PNG: tenta o próximo.
      if (!data.startsWith(`data:${type}`)) break
      if (data.length <= MAX_PHOTO_CHARS) return data
    }
  }
  throw new Error("Não foi possível reduzir a foto para o tamanho aceito. Tente outra imagem.")
}
