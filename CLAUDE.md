# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (Next.js, default port 3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`, `eslint-config-next`)

There is no test suite configured in this repo (no test script, no test runner dependency).

## Architecture

Next.js 16 App Router project (mixed JS/TSX: `app/layout.tsx` is TypeScript, all pages and API routes are plain `.js`). Tailwind CSS v4 for styling, `recharts` for charts. No database — all data is either fetched live from external APIs or persisted client-side in `localStorage`.

**`next.config.mjs` disables build-time checks**: `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` are both `true`. TypeScript `strict` is on in `tsconfig.json`, but type/lint errors will not fail `npm run build` — don't assume a clean build means the code type-checks or lints cleanly.

`app/error.js` is a root error boundary (client component) that catches unhandled render errors anywhere under `app/` and shows a message + reset button instead of a blank page. Client components that fetch from the API routes below (`NewsCard`/`StockTicker` in particular) also defensively check `Array.isArray(data)` before using the response, since a non-2xx/error-shaped JSON response would otherwise crash the component.

### Routes

- `/` (`app/page.tsx`) — main dashboard: live stock/macro ticker (`StockTicker`) + category news cards (`NewsCard`), both client components that poll the API routes below on mount.
- `/archive` (`app/archive/page.js`) — "ETF 포트폴리오 빌더" (portfolio builder). A single large client component (~800+ lines) with six tabs (내 자산 / 모델 포트폴리오 / 보유 비중 / 수익률 및 배당 / 리밸런싱 / 종목 진단), all derived state (portfolio weights, sector/size/style exposure, CAGR-weighted backtest projection, Benjamin Graham fair-value calculator) computed inline on every render from `masterPool` (fetched) + `tabLists`/`quantities` (local state).
- `/infinite` (`app/infinite/page.js`) — thin wrapper that embeds an external site (`https://fire-gate.app/`) in a full-screen iframe.
- `/journal` (`app/journal/page.js`) — personal trade journal (매매일지): ticker, buy date, buy price, quantity, and a free-text rationale per entry. Pure client component, no API calls; entries live only in `localStorage` (see below), so the data is private to whichever browser/device created it and is not visible to other visitors of the deployed site.

### API routes (`app/api/*/route.js`)

These are server-side data-fetching proxies with no persistence layer; price data uses `cache: 'no-store'` and spoofs a browser `User-Agent` when calling external services. Two routes (`api/etfs`'s sector weightings, `api/sector-performance`) deliberately deviate from the no-cache pattern — see below.

- `api/news` — for `query === '해외증시'`, scrapes Naver Finance news listing directly (`cheerio` + `iconv-lite` to decode EUC-KR), falling back to the Naver Search API on scrape failure. All other categories go straight to the Naver Search News API. Naver API credentials are read from `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` env vars (see `.env.example`); the route returns a 500 with a clear message if they're unset.
- `api/stocks` (`dynamic = 'force-dynamic'`) — pulls a fixed list of indices/ETFs/macro tickers from Yahoo Finance's undocumented chart endpoint (`query2.finance.yahoo.com/v8/finance/chart/...`). Has custom logic to pick pre-market/regular/post-market price and compute change % differently for ETFs (`TQQQ`/`SOXL`) vs. indices, plus a secondary "spot" price fetch for futures symbols (e.g. `ES=F` → `^GSPC`).
- `api/etfs` (`dynamic = 'force-dynamic'`) — contains a large hardcoded `masterPool` object (~80 Korean- and US-listed ETFs) with static metadata (size/style weights, dividend yield, CAGR by period) baked into the source, then fetches a live price for each symbol from the same Yahoo Finance chart endpoint and merges it in. Sector weightings are the exception to "hardcoded": they're fetched live per-symbol via the `yahoo-finance2` package (`quoteSummary` → `topHoldings.sectorWeightings`), wrapped in `unstable_cache` with a 7-day revalidate (`SECTOR_CACHE_SECONDS`), and fall back to the hardcoded `sectors` value in `masterPool` when Yahoo has no data for that symbol (common for `.KS`-listed ETFs) — each item's `xray.sectorsSource` is `'live'` or `'fallback'` accordingly.
- `api/sector-performance` — independent of `api/etfs`; computes 1-year return and a long-term (up to 10y, shorter for younger funds) annualized CAGR for the 11 GICS sector SPDR ETFs (XLK, XLF, XLV, XLY, XLP, XLI, XLE, XLU, XLB, XLRE, XLC) from `yahoo-finance2`'s `chart()` module (weekly candles). Entire result is wrapped in `unstable_cache` with a 7-day revalidate. Consumed lazily by `/archive`'s 리밸런싱 tab (fetched only once that tab is opened, not on every `/archive` page load).

### Client-side persistence

`/archive` persists user portfolio state directly to `localStorage` under `kijay_tab_configurations` (tab → holdings/weights) and `kijay_etf_counts_v2` (share quantities). `/journal` persists trade-journal entries under `kijay_trade_journal`. There is no backend/database, so all of this state is per-browser only — it does not sync across devices and is not visible to other visitors of the site.
