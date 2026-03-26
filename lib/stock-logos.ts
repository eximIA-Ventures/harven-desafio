// Logo URL pattern from brapi.dev (free, no auth)
export function getStockLogoUrl(ticker: string): string {
  return `https://icons.brapi.dev/icons/${ticker}.svg`;
}
