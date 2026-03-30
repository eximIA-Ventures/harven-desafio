// Allocation model weights for portfolio return calculation
// "acoes" = user's 10 stock picks (equal weight average)
// Other keys = benchmark asset classes fetched during liquidation

export const ALLOCATION_WEIGHTS: Record<number, Record<string, number>> = {
  // Conservador: 25% stock picks + 75% diversified
  1: { acoes: 0.25, rf: 0.50, ouro: 0.10, dolar: 0.10, cripto: 0.05, eua: 0.00 },
  // Moderado: 50% stock picks + 50% diversified
  2: { acoes: 0.50, rf: 0.25, ouro: 0.10, dolar: 0.05, cripto: 0.05, eua: 0.05 },
  // Arrojado: 75% stock picks + 25% diversified
  3: { acoes: 0.75, rf: 0.10, ouro: 0.05, dolar: 0.05, cripto: 0.05, eua: 0.00 },
  // Agressivo: 0% RF, máxima exposição a ativos voláteis
  4: { acoes: 0.40, rf: 0.00, ouro: 0.15, dolar: 0.10, cripto: 0.20, eua: 0.10, china: 0.05 },
};

// Map allocation keys to B3 ETF tickers for brapi
export const BENCHMARK_TICKERS: Record<string, string> = {
  ouro: "GOLD11",
  cripto: "HASH11",
  eua: "IVVB11",
  china: "XINA11",
};

// Selic 2026 (~14.25%/year) → monthly CDI
export const CDI_ANNUAL_RATE = 0.1425;
export const CDI_MONTHLY_RATE = Math.pow(1 + CDI_ANNUAL_RATE, 1 / 12) - 1;
