// =============================================================================
// Google Finance — Complementary price source for B3 stocks
// =============================================================================
// Scrapes current quotes from Google Finance as fallback/complement to brapi.
// URL pattern: https://www.google.com/finance/quote/{TICKER}:BVMF
// =============================================================================

export type GoogleFinanceQuote = {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  source: "google-finance";
};

const GF_BASE = "https://www.google.com/finance/quote";
const GF_EXCHANGE = "BVMF";

/**
 * Fetch a single stock quote from Google Finance.
 * Parses price data from the HTML response using regex patterns.
 */
async function fetchSingleQuote(
  ticker: string
): Promise<GoogleFinanceQuote | null> {
  try {
    const url = `${GF_BASE}/${ticker}:${GF_EXCHANGE}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Extract price from data attribute pattern: data-last-price="XX.XX"
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    const changeMatch = html.match(/data-price-change="([^"]+)"/);
    const changePctMatch = html.match(/data-percentage-change="([^"]+)"/);

    if (!priceMatch) {
      // Fallback: try to extract from JSON-LD structured data
      const jsonLdMatch = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
      );
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.price) {
            return {
              ticker,
              price: parseFloat(jsonLd.price),
              change: 0,
              changePercent: 0,
              source: "google-finance",
            };
          }
        } catch {
          // JSON parse failed, skip
        }
      }
      return null;
    }

    const price = parseFloat(priceMatch[1]);
    const change = changeMatch ? parseFloat(changeMatch[1]) : 0;
    const changePercent = changePctMatch ? parseFloat(changePctMatch[1]) : 0;

    if (isNaN(price) || price <= 0) return null;

    return { ticker, price, change, changePercent, source: "google-finance" };
  } catch (error) {
    console.error(`[GoogleFinance] Failed to fetch ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch multiple stock quotes from Google Finance.
 * Runs in parallel with concurrency limit to avoid rate-limiting.
 */
export async function fetchGoogleFinanceQuotes(
  tickers: string[]
): Promise<Record<string, GoogleFinanceQuote>> {
  const CONCURRENCY = 5;
  const results: Record<string, GoogleFinanceQuote> = {};

  // Process in batches
  for (let i = 0; i < tickers.length; i += CONCURRENCY) {
    const batch = tickers.slice(i, i + CONCURRENCY);
    const quotes = await Promise.allSettled(batch.map(fetchSingleQuote));

    for (const result of quotes) {
      if (result.status === "fulfilled" && result.value) {
        results[result.value.ticker] = result.value;
      }
    }
  }

  return results;
}

/**
 * Fetch IBOV index from Google Finance.
 */
export async function fetchGoogleFinanceIbov(): Promise<{
  price: number;
  changePercent: number;
} | null> {
  try {
    const url = `${GF_BASE}/IBOV:INDEXBVMF`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    const changePctMatch = html.match(/data-percentage-change="([^"]+)"/);

    if (!priceMatch) return null;

    return {
      price: parseFloat(priceMatch[1]),
      changePercent: changePctMatch ? parseFloat(changePctMatch[1]) : 0,
    };
  } catch (error) {
    console.error("[GoogleFinance] Failed to fetch IBOV:", error);
    return null;
  }
}
