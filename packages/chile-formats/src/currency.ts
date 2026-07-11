const clpFormatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const numberFormatter = new Intl.NumberFormat('es-CL');
const ufFormatter = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Pesos chilenos: 1234567 → "$1.234.567" (0 decimales, separador de miles ".", es-CL). */
export function formatCLP(value: number): string {
  return clpFormatter.format(value);
}

/** UF con 2 decimales: 39876.54 → "UF 39.876,54". */
export function formatUF(value: number): string {
  return `UF ${ufFormatter.format(value)}`;
}

/** Número es-CL: 1234567.89 → "1.234.567,89". */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
