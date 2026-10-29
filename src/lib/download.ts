/** Baixa um CSV (separador ";" e BOM, para abrir direto no Excel em português). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value)
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const content = "﻿" + rows.map((row) => row.map(escape).join(";")).join("\r\n")
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
