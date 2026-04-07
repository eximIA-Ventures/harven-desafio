// =============================================================================
// Price Service — Multi-source price aggregation
// =============================================================================
// Primary: brapi.dev | Complementary/Fallback: Google Finance
// Provides unified interface for live prices, reference prices, and benchmarks.
// =============================================================================

import { fetchGoogleFinanceQuotes, fetchGoogleFinanceIbov } from "./google-finance";
import {
  BENCHMARK_TICKERS,
  CDI_MONTHLY_RATE,
} from "./allocation-weights";

export type LiveQuote = {
  ticker: string;
  price: number;
  changePercent: number;
  source: "brapi" | "google-finance";
};

// ─── In-memory cache ─────────────────────────────────────────────────────────

type CacheEntry<T> = { data: T; fetchedAt: number };

const liveCache: { quotes: CacheEntry<Record<string, LiveQuote>> | null } = {
  quotes: null,
};
const LIVE_CACHE_TTL = 1000 * 60 * 15; // 15 minutes

// ─── Live Prices (current quotes) ────────────────────────────────────────────

/**
 * Fetch live prices for given tickers.
 * 1. Tries brapi (bulk endpoint)
 * 2. For missing tickers, falls back to Google Finance
 * Returns map of ticker → LiveQuote
 */
export async function fetchLivePrices(
  tickers: string[]
): Promise<Record<string, LiveQuote>> {
  // Check cache
  if (
    liveCache.quotes &&
    Date.now() - liveCache.quotes.fetchedAt < LIVE_CACHE_TTL
  ) {
    const cached = liveCache.quotes.data;
    const allFound = tickers.every((t) => t in cached);
    if (allFound) return cached;
  }

  const results: Record<string, LiveQuote> = {};

  // Step 1: brapi bulk
  try {
    const token = process.env.BRAPI_TOKEN
      ? `&token=${process.env.BRAPI_TOKEN}`
      : "";
    const res = await fetch(
      `https://brapi.dev/api/quote/list?limit=120&sortBy=market_cap_basic&sortOrder=desc${token}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (res.ok) {
      const data = await res.json();
      const tickerSet = new Set(tickers);

      for (const s of data.stocks || []) {
        if (tickerSet.has(s.stock) && s.close) {
          results[s.stock] = {
            ticker: s.stock,
            price: s.close,
            changePercent: s.change ?? 0,
            source: "brapi",
          };
        }
      }
    }
  } catch (error) {
    console.error("[PriceService] brapi bulk failed:", error);
  }

  // Step 2: Google Finance fallback for missing tickers
  const missing = tickers.filter((t) => !(t in results));
  if (missing.length > 0) {
    console.log(
      `[PriceService] ${missing.length} tickers missing from brapi, trying Google Finance:`,
      missing
    );
    const gfQuotes = await fetchGoogleFinanceQuotes(missing);
    for (const [ticker, quote] of Object.entries(gfQuotes)) {
      results[ticker] = {
        ticker,
        price: quote.price,
        changePercent: quote.changePercent,
        source: "google-finance",
      };
    }
  }

  // Update cache
  liveCache.quotes = { data: results, fetchedAt: Date.now() };

  return results;
}

// ─── Reference Prices (close of last business day of previous month) ─────────

/**
 * Fetch reference prices for a set of tickers for a given cycle.
 * Uses Yahoo Finance (free, no token required) to get the closing price
 * from the last business day of the month before the cycle's month.
 * Falls back to Google Finance for missing tickers.
 */
export async function fetchReferencePrices(
  tickers: string[],
  cycleMonth: number,
  cycleYear: number
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  const firstDayCurrentMonth =
    new Date(cycleYear, cycleMonth - 1, 1).getTime() / 1000;

  // Yahoo Finance: fetch one ticker at a time (reliable, no token needed)
  // Brazilian stocks use .SA suffix
  const CONCURRENCY = 5;

  for (let i = 0; i < tickers.length; i += CONCURRENCY) {
    const batch = tickers.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.allSettled(
      batch.map(async (ticker) => {
        try {
          const yahooTicker = `${ticker}.SA`;
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?range=1mo&interval=1d`,
            {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(10000),
            }
          );

          if (!res.ok) return null;

          const data = await res.json();
          const chart = data.chart?.result?.[0];
          if (!chart) return null;

          const timestamps = chart.timestamp as number[] | undefined;
          const closes = chart.indicators?.quote?.[0]?.close as
            | number[]
            | undefined;

          if (!timestamps || !closes) return null;

          // Find last entry before the current month
          let refPrice: number | null = null;
          for (let j = timestamps.length - 1; j >= 0; j--) {
            if (
              timestamps[j] < firstDayCurrentMonth &&
              closes[j] != null &&
              closes[j] > 0
            ) {
              refPrice = closes[j];
              break;
            }
          }

          if (refPrice) {
            return { ticker, price: refPrice };
          }

          // Fallback: first available price
          const firstValid = closes.find((c) => c != null && c > 0);
          if (firstValid) {
            return { ticker, price: firstValid };
          }

          return null;
        } catch {
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        results[result.value.ticker] = result.value.price;
      }
    }
  }

  // Log coverage
  const found = Object.keys(results).length;
  const missing = tickers.filter((t) => !(t in results));
  if (missing.length > 0) {
    console.log(
      `[PriceService] Reference prices: ${found}/${tickers.length} from Yahoo Finance. Missing:`,
      missing
    );
  } else {
    console.log(
      `[PriceService] Reference prices: ${found}/${tickers.length} from Yahoo Finance`
    );
  }

  return results;
}

// ─── Live Benchmark Returns ──────────────────────────────────────────────────

/**
 * Fetch current month-to-date returns for benchmark assets.
 * Returns the same keys as ALLOCATION_WEIGHTS: rf, ouro, cripto, dolar, eua
 */
export async function fetchLiveBenchmarks(): Promise<Record<string, number>> {
  const returns: Record<string, number> = {};

  // CDI (computed from Selic — accrued so far this month)
  const now = new Date();
  const dayOfMonth = now.getDate();
  const businessDaysElapsed = Math.max(1, Math.floor(dayOfMonth * 5 / 7));
  const dailyCdi = Math.pow(1 + CDI_MONTHLY_RATE, 1 / 22) - 1;
  returns.rf = Math.pow(1 + dailyCdi, businessDaysElapsed) - 1;

  // ETF benchmarks from brapi
  const etfTickers = Object.values(BENCHMARK_TICKERS);
  try {
    const token = process.env.BRAPI_TOKEN
      ? `&token=${process.env.BRAPI_TOKEN}`
      : "";
    const res = await fetch(
      `https://brapi.dev/api/quote/${etfTickers.join(",")}?range=1mo&interval=1mo${token}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (res.ok) {
      const data = await res.json();
      for (const result of data.results ?? []) {
        const ticker = result.symbol;
        const key = Object.entries(BENCHMARK_TICKERS).find(
          ([, v]) => v === ticker
        )?.[0];
        if (!key) continue;

        if (result.regularMarketChangePercent != null) {
          returns[key] = result.regularMarketChangePercent / 100;
        }
      }
    }
  } catch (error) {
    console.error("[PriceService] Failed to fetch ETF benchmarks:", error);
  }

  // USD/BRL
  try {
    const res = await fetch(
      "https://brapi.dev/api/v2/currency?currency=USD-BRL",
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const data = await res.json();
      const usd = data.currency?.[0];
      if (usd?.bidVariation) {
        returns.dolar = parseFloat(usd.bidVariation) / 100;
      }
    }
  } catch (error) {
    console.error("[PriceService] Failed to fetch USD/BRL:", error);
  }

  return returns;
}

// ─── Live IBOV Return ────────────────────────────────────────────────────────

/**
 * Fetch current month-to-date IBOV return.
 * Uses Yahoo Finance (^BVSP) with brapi and Google Finance as fallbacks.
 */
export async function fetchLiveIbovReturn(): Promise<number> {
  // Try Yahoo Finance first (most reliable, free)
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=1mo&interval=1d",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const chart = data.chart?.result?.[0];
      if (chart) {
        const timestamps = chart.timestamp as number[];
        const closes = chart.indicators?.quote?.[0]?.close as number[];

        if (timestamps && closes && closes.length >= 2) {
          // First day of current month
          const now = new Date();
          const firstDay =
            new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000;

          // Find close of last business day of previous month
          let refClose: number | null = null;
          for (let i = timestamps.length - 1; i >= 0; i--) {
            if (timestamps[i] < firstDay && closes[i] != null) {
              refClose = closes[i];
              break;
            }
          }

          // Current (last) close
          const currentClose = closes[closes.length - 1];

          if (refClose && currentClose) {
            return (currentClose - refClose) / refClose;
          }
        }
      }
    }
  } catch (error) {
    console.error("[PriceService] Yahoo Finance IBOV failed:", error);
  }

  // Fallback: brapi
  try {
    const token = process.env.BRAPI_TOKEN
      ? `&token=${process.env.BRAPI_TOKEN}`
      : "";
    const res = await fetch(
      `https://brapi.dev/api/quote/%5EBVSP?range=1mo&interval=1mo${token}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (res.ok) {
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.regularMarketChangePercent != null) {
        return result.regularMarketChangePercent / 100;
      }
    }
  } catch (error) {
    console.error("[PriceService] brapi IBOV failed:", error);
  }

  // Fallback: Google Finance
  const gfIbov = await fetchGoogleFinanceIbov();
  if (gfIbov) {
    return gfIbov.changePercent / 100;
  }

  return 0;
}
