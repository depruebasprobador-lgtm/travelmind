// ──────────────────────────────────────────────────────────────────────────────
// settlement.js
// Módulo puro para gastos compartidos:
//   1. computeBalances()      → balance neto de cada participante (por divisa)
//   2. simplifyDebts()        → greedy para devolver el mínimo de transferencias
//   3. computeShares()        → cuánto debe cada partícipe en un gasto concreto
//
// La app es single-user: los "participantes" son nombres que el dueño del
// viaje define manualmente. No hay autenticación. Todos los importes deben
// estar en la misma divisa para que el balance tenga sentido — por eso
// agrupamos por `currency` y devolvemos un objeto por divisa.
// ──────────────────────────────────────────────────────────────────────────────

const EPS = 0.01; // céntimo: tolerancia al comparar floats

/**
 * Calcula cuánto le toca pagar a cada partícipe en un gasto concreto.
 * Modos soportados:
 *   - 'equal'   → reparto igualitario entre los `splitBetween` (default)
 *   - 'shares'  → reparto proporcional por `splits[id]` (cuotas)
 *   - 'amounts' → cada `splits[id]` es el importe absoluto que esa persona debe
 *
 * @param {object} expense
 * @returns {Record<string, number>}  participantId → importe a su cargo
 */
export function computeShares(expense) {
  if (!expense || !expense.amount) return {};
  const total = Number(expense.amount) || 0;
  const between = Array.isArray(expense.splitBetween) ? expense.splitBetween : [];
  const mode = expense.splitMode || 'equal';

  if (between.length === 0) return {};

  if (mode === 'equal') {
    // División entera con reparto del residuo en céntimos al primero
    const baseCents = Math.floor((total * 100) / between.length);
    const residueCents = Math.round(total * 100) - baseCents * between.length;
    const out = {};
    between.forEach((id, i) => {
      out[id] = (baseCents + (i < residueCents ? 1 : 0)) / 100;
    });
    return out;
  }

  if (mode === 'shares') {
    const shares = expense.splits || {};
    const totalShares = between.reduce((s, id) => s + (Number(shares[id]) || 0), 0);
    if (totalShares <= 0) return computeShares({ ...expense, splitMode: 'equal' });
    const out = {};
    between.forEach(id => {
      const share = Number(shares[id]) || 0;
      out[id] = Math.round((total * share / totalShares) * 100) / 100;
    });
    return out;
  }

  if (mode === 'amounts') {
    const splits = expense.splits || {};
    const out = {};
    between.forEach(id => {
      out[id] = Math.round((Number(splits[id]) || 0) * 100) / 100;
    });
    return out;
  }

  return {};
}

/**
 * Calcula los balances netos por divisa. Positivo = se le debe a esa persona.
 * Negativo = esa persona debe pagar.
 *
 * @param {Array<object>} expenses     lista de gastos del viaje
 * @param {Array<object>} participants lista de participantes [{ id, name, ... }]
 * @returns {{
 *   balances: Record<string, Record<string, number>>,  // currency → id → balance
 *   totalsByCurrency: Record<string, number>,
 *   warnings: string[]
 * }}
 */
export function computeBalances(expenses, participants) {
  const out = { balances: {}, totalsByCurrency: {}, warnings: [] };
  const validIds = new Set((participants || []).map(p => p.id));

  for (const exp of expenses || []) {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) continue;
    if (!exp.paidBy) { out.warnings.push(`Gasto "${exp.description}" sin pagador asignado`); continue; }
    if (!validIds.has(exp.paidBy)) { out.warnings.push(`Pagador desconocido en "${exp.description}"`); continue; }
    const between = Array.isArray(exp.splitBetween) ? exp.splitBetween.filter(id => validIds.has(id)) : [];
    if (between.length === 0) { out.warnings.push(`Gasto "${exp.description}" sin partícipes`); continue; }

    const currency = exp.currency || 'EUR';
    if (!out.balances[currency]) out.balances[currency] = {};
    if (!out.totalsByCurrency[currency]) out.totalsByCurrency[currency] = 0;
    out.totalsByCurrency[currency] += amount;

    // El pagador adelantó `amount`
    out.balances[currency][exp.paidBy] = (out.balances[currency][exp.paidBy] || 0) + amount;

    // Cada partícipe debe su parte
    const shares = computeShares({ ...exp, splitBetween: between });
    for (const [id, share] of Object.entries(shares)) {
      out.balances[currency][id] = (out.balances[currency][id] || 0) - share;
    }
  }

  // Limpiar errores de redondeo (ej. 0.0000001 → 0)
  for (const cur of Object.keys(out.balances)) {
    for (const id of Object.keys(out.balances[cur])) {
      const v = Math.round(out.balances[cur][id] * 100) / 100;
      out.balances[cur][id] = Math.abs(v) < EPS ? 0 : v;
    }
  }

  return out;
}

/**
 * Greedy debt simplification.
 *
 * Algoritmo:
 *   1. Separa en acreedores (balance > 0) y deudores (balance < 0).
 *   2. Ordena ambas listas por valor absoluto descendente.
 *   3. Toma el primer acreedor y el primer deudor: la cantidad de la
 *      transferencia es min(|acreedor|, |deudor|).
 *   4. Resta esa cantidad a ambos. Si alguno queda a 0, se elimina.
 *   5. Repite hasta que las dos listas estén vacías.
 *
 * Garantiza ≤ N-1 transferencias para N personas con balance no nulo.
 * (No es la solución óptima absoluta — eso es NP-hard — pero es la
 *  heurística estándar que pide el enunciado y da resultados muy buenos.)
 *
 * @param {Record<string, number>} balances  participantId → balance neto
 * @returns {Array<{ from: string, to: string, amount: number }>}
 */
export function simplifyDebts(balances) {
  if (!balances || typeof balances !== 'object') return [];

  // Trabajamos con céntimos en enteros para evitar problemas de floats
  const creditors = []; // { id, cents }   cents > 0
  const debtors   = []; // { id, cents }   cents > 0  (en magnitud; ya negados)

  for (const [id, val] of Object.entries(balances)) {
    const cents = Math.round((Number(val) || 0) * 100);
    if (cents > 0) creditors.push({ id, cents });
    else if (cents < 0) debtors.push({ id, cents: -cents });
  }

  // Greedy: ordenar de mayor a menor magnitud
  creditors.sort((a, b) => b.cents - a.cents);
  debtors.sort((a, b) => b.cents - a.cents);

  const transfers = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const pay = Math.min(d.cents, c.cents);

    transfers.push({
      from: d.id,
      to: c.id,
      amount: Math.round(pay) / 100,
    });

    d.cents -= pay;
    c.cents -= pay;

    if (d.cents === 0) i++;
    if (c.cents === 0) j++;
  }

  return transfers;
}

/**
 * Atajo: dado el resultado de computeBalances, devuelve las transferencias por divisa.
 * @returns {Record<string, Array<{from,to,amount}>>}
 */
export function simplifyByCurrency(balancesByCurrency) {
  const out = {};
  for (const [currency, balances] of Object.entries(balancesByCurrency || {})) {
    out[currency] = simplifyDebts(balances);
  }
  return out;
}
