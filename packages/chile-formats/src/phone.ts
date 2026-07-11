/** Extrae los 9 dígitos nacionales de un teléfono chileno (tolerante a +56/espacios). */
function nationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('56')) digits = digits.slice(2);
  return digits;
}

/** Normaliza a "+569XXXXXXXX" (persistible). Si no reconoce 9 dígitos, retorna input.trim(). */
export function normalizePhone(input: string): string {
  const nat = nationalDigits(input);
  if (nat.length === 9) return `+56${nat}`;
  return input.trim();
}

/** Formato visual "+56 9 XXXX XXXX". Tolerante: si no reconoce 9 dígitos, retorna input.trim(). */
export function formatPhone(input: string): string {
  const nat = nationalDigits(input);
  if (nat.length !== 9) return input.trim();
  return `+56 ${nat[0]} ${nat.slice(1, 5)} ${nat.slice(5)}`;
}
