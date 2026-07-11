/** Limpia un RUT: sin puntos/guion/espacios, DV en mayúscula. "12.345.678-5" → "123456785". */
export function cleanRut(input: string): string {
  return input.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Calcula el dígito verificador (módulo 11) del cuerpo numérico. Retorna "0"-"9" o "K". */
export function computeDv(body: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return '0';
  if (res === 10) return 'K';
  return String(res);
}

/** Valida un RUT completo (cuerpo + DV) por módulo 11. Tolera puntos/guion/espacios. */
export function isValidRut(input: string): boolean {
  const clean = cleanRut(input);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return computeDv(body) === dv;
}

/** Formatea un RUT con puntos y guion: "123456785" → "12.345.678-5". No valida. */
export function formatRut(input: string): string {
  const clean = cleanRut(input);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv}`;
}
