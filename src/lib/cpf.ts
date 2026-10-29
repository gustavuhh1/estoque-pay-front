/** Valida um CPF (11 dígitos com os dois dígitos verificadores corretos). */
export function isValidCpf(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const check = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10])
}
