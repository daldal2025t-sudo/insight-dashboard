import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const fetchYahoo = async (symbol) => {
      try {
        const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice !== undefined) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.previousClose;
            const changeRaw = ((price - prevClose) / prevClose) * 100;
            return { price, changeRaw };
          }
        }
      } catch (e) {
        console.error(`야후 fetch 에러 (${symbol}):`, e);
      }
      return null;
    };

    const [domesticData, upbitBtc, yahooItems] = await Promise.all([
      
      // ====================================================================
      // 🔵 트랙 1: 네이버 스크래핑 (코스피 / 코스닥)
      // ====================================================================
      (async () => {
        const domesticSymbols = [
          { name: 'KOSPI', url: 'https://finance.naver.com/sise/sise_index.naver?code=KOSPI' },
          { name: 'KOSDAQ', url: 'https://finance.naver.com/sise/sise_index.naver?code=KOSDAQ' }
        ];
        return Promise.all(domesticSymbols.map(async (item) => {
          try {
            const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
            const buffer = await res.arrayBuffer();
            const decoder = new TextDecoder('euc-kr');
            const html = decoder.decode(buffer);
            const $ = cheerio.load(html);

            const rawValue = $('#now_value').text().trim();
            const cleanValue = rawValue.replace(/[^0-9.]/g, '');
            const formattedValue = cleanValue ? parseFloat(cleanValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
            
            const changeText = $('#change_value_and_rate').text().trim();
            const parts = changeText.split(/\s+/);
            let change = parts.length > 1 ? parts[1] : '0.00%';
            change = change.replace('상승', '').replace('하락', '').replace('+', '').replace('-', '').trim();
            const isUp = !$('.after_btn').hasClass('down');

            return { name: item.name, value: formattedValue, change: change.includes('%') ? change : change + '%', isUp, suffix: '' };
          } catch (e) {
            return { name: item.name, value: '-', change: '0.00%', isUp: true, suffix: '' };
          }
        }));
      })(),

      // ====================================================================
      // 🪙 트랙 2: 업비트 실시간 원화 비트코인
      // ====================================================================
      (async () => {
        let btcObj = { name: '비트코인', value: '-', change: '0.00%', isUp: true, suffix: '원' };
        try {
          const upbitRes = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC', { cache: 'no-store' });
          if (upbitRes.ok) {
            const upbitData = await upbitRes.json();
            if (upbitData && upbitData[0]) {
              const coin = upbitData[0];
              const value = coin.trade_price.toLocaleString('en-US');
              const change = (Math.abs(coin.signed_change_rate) * 100).toFixed(2) + '%';
              btcObj = { name: '비트코인', value, change, isUp: coin.signed_change_rate >= 0, suffix: '원' };
            }
          }
        } catch (e) {}
        return btcObj;
      })(),

      // ====================================================================
      // 🔴 트랙 3: 야후 파이낸스 (VIX 및 금 선물 추가 확장)
      // ====================================================================
      (async () => {
        const dualTickers = [
          { key: 'sp500', name: 'S&P 500', fut: 'ES=F', spot: '^GSPC' },
          { key: 'nasdaq', name: 'NASDAQ', fut: 'NQ=F', spot: '^IXIC' },
          { key: 'dow', name: 'DOW', fut: 'YM=F', spot: '^DJI' },
          { key: 'russell', name: 'Russell 2000', fut: 'RTY=F', spot: '^RUT' }
        ];

        // 💡 VIX 지수와 금 선물을 리스트에 추가했습니다.
        const singleTickers = [
          { key: 'fx', symbol: 'KRW=X', name: '원/달러 환율', suffix: '원', isFormat: true, digits: 2 },
          { key: 'tnx', symbol: '^TNX', name: '미국 10년물 국채금리', suffix: '%', isFormat: false, digits: 3 },
          { key: 'vix', symbol: '^VIX', name: 'VIX 공포지수', suffix: '', isFormat: true, digits: 2 },
          { key: 'gold', symbol: 'GC=F', name: '국제 금 선물', suffix: '달러', isFormat: true, digits: 2 }
        ];

        const results = {};

        await Promise.all(dualTickers.map(async (item) => {
          const [futData, spotData] = await Promise.all([
            fetchYahoo(item.fut),
            fetchYahoo(item.spot)
          ]);

          results[item.key] = {
            name: item.name,
            value: futData ? futData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
            change: futData ? Math.abs(futData.changeRaw).toFixed(2) + '%' : '0.00%',
            isUp: futData ? futData.changeRaw >= 0 : true,
            suffix: '',
            spotChange: spotData ? Math.abs(spotData.changeRaw).toFixed(2) + '%' : null,
            isSpotUp: spotData ? spotData.changeRaw >= 0 : true
          };
        }));

        await Promise.all(singleTickers.map(async (item) => {
          const data = await fetchYahoo(item.symbol);
          let displayValue = '-';
          if (data) {
            displayValue = item.isFormat 
              ? data.price.toLocaleString('en-US', { minimumFractionDigits: item.digits, maximumFractionDigits: item.digits })
              : data.price.toFixed(item.digits);
          }
          
          results[item.key] = {
            name: item.name,
            value: displayValue,
            change: data ? Math.abs(data.changeRaw).toFixed(2) + '%' : '0.00%',
            isUp: data ? data.changeRaw >= 0 : true,
            suffix: item.suffix
          };
        }));

        return results;
      })()
    ]);

    // 💡 최종 응답 배열 순서 조립 (미국 4대 지수, 국내 2대 지수, 그 아래 매크로 5종 순서)
    const finalStockData = [
      yahooItems.sp500,    
      yahooItems.nasdaq,   
      yahooItems.dow,      
      yahooItems.russell,  
      domesticData[0],      
      domesticData[1],      
      yahooItems.fx,       
      yahooItems.tnx,
      yahooItems.vix,   // VIX 배치
      yahooItems.gold,  // 골드 배치
      upbitBtc 
    ];

    return NextResponse.json(finalStockData);

  } catch (error) {
    return NextResponse.json({ error: '듀얼 파싱 엔진 치명적 에러' }, { status: 500 });
  }
}