export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const masterPool = {
    '360200': { name: 'ACE 미국S&P500', symbol: '360200.KS', sectors: { tech: 31, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 2 }, sizes: { large: 86, mid: 13, small: 1 }, styles: { value: 25, blend: 45, growth: 30 }, div: 1.3, cagr: { '1y': 25, '3y': 10, '5y': 14 } },
    '360750': { name: 'ACE 미국나스닥100', symbol: '360750.KS', sectors: { tech: 51, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 1 }, sizes: { large: 96, mid: 4, small: 0 }, styles: { value: 5, blend: 25, growth: 70 }, div: 0.6, cagr: { '1y': 35, '3y': 12, '5y': 19 } },
    '449180': { name: 'KODEX 미국S&P500(H)', symbol: '449180.KS', sectors: { tech: 30, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 3 }, sizes: { large: 85, mid: 14, small: 1 }, styles: { value: 25, blend: 45, growth: 30 }, div: 1.3, cagr: { '1y': 25, '3y': 10, '5y': 14 } },
    '449190': { name: 'KODEX 미국나스닥100(H)', symbol: '449190.KS', sectors: { tech: 50, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 2 }, sizes: { large: 95, mid: 5, small: 0 }, styles: { value: 5, blend: 25, growth: 70 }, div: 0.6, cagr: { '1y': 35, '3y': 12, '5y': 19 } },
    '409810': { name: 'ACE 미국보수적자산배분형', symbol: '409810.KS', sectors: { tech: 15, finance: 25, health: 10, consumer_cyc: 8, ind: 12, communication: 5, consumer_def: 10, energy: 6, utilities: 4, basic: 3, realestate: 2 }, sizes: { large: 60, mid: 30, small: 10 }, styles: { value: 50, blend: 40, growth: 10 }, div: 2.5, cagr: { '1y': 10, '3y': 5, '5y': 7 } },
    '280930': { name: 'KODEX 미국러셀2000(H)', symbol: '280930.KS', sectors: { tech: 14, finance: 16, health: 15, consumer_cyc: 11, ind: 17, communication: 2, consumer_def: 3, energy: 7, utilities: 3, basic: 4, realestate: 8 }, sizes: { large: 0, mid: 15, small: 85 }, styles: { value: 40, blend: 30, growth: 30 }, div: 1.5, cagr: { '1y': 15, '3y': 2, '5y': 8 } },
    '245340': { name: 'TIGER 미국다우존스30', symbol: '245340.KS', sectors: { tech: 19, finance: 20, health: 18, consumer_cyc: 14, ind: 13, communication: 4, consumer_def: 7, energy: 3, utilities: 1, basic: 1, realestate: 0 }, sizes: { large: 92, mid: 8, small: 0 }, styles: { value: 45, blend: 40, growth: 15 }, div: 1.9, cagr: { '1y': 18, '3y': 8, '5y': 11 } },

    '452360': { name: 'SOL 미국배당다우존스(H)', symbol: '452360.KS', sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 }, sizes: { large: 70, mid: 25, small: 5 }, styles: { value: 60, blend: 35, growth: 5 }, div: 3.5, cagr: { '1y': 10, '3y': 7, '5y': 11 } },
    '446770': { name: 'SOL 미국배당다우존스', symbol: '446770.KS', sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 }, sizes: { large: 70, mid: 25, small: 5 }, styles: { value: 60, blend: 35, growth: 5 }, div: 3.5, cagr: { '1y': 10, '3y': 7, '5y': 11 } },
    '0046Y0': { name: 'ACE 미국배당퀄리티', symbol: '0046Y0.KS', sectors: { tech: 22, finance: 15, health: 14, consumer_cyc: 10, ind: 12, communication: 4, consumer_def: 11, energy: 6, utilities: 3, basic: 3, realestate: 0 }, sizes: { large: 75, mid: 22, small: 3 }, styles: { value: 45, blend: 45, growth: 10 }, div: 2.8, cagr: { '1y': 18, '3y': 9, '5y': 13 } },
    '429000': { name: 'TIGER 미국S&P500배당귀족', symbol: '429000.KS', sectors: { tech: 3, finance: 12, health: 10, consumer_cyc: 14, ind: 22, communication: 2, consumer_def: 18, energy: 4, utilities: 5, basic: 10, realestate: 0 }, sizes: { large: 45, mid: 50, small: 5 }, styles: { value: 55, blend: 40, growth: 5 }, div: 2.1, cagr: { '1y': 12, '3y': 8, '5y': 10 } },
    '479420': { name: 'ACE 미국S&P500배당성장', symbol: '479420.KS', sectors: { tech: 15, finance: 18, health: 12, consumer_cyc: 11, ind: 13, communication: 4, consumer_def: 14, energy: 8, utilities: 3, basic: 2, realestate: 0 }, sizes: { large: 72, mid: 25, small: 3 }, styles: { value: 50, blend: 45, growth: 5 }, div: 2.3, cagr: { '1y': 16, '3y': 9, '5y': 12 } },
    '458730': { name: 'TIGER 미국배당다우존스', symbol: '458730.KS', sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 }, sizes: { large: 70, mid: 25, small: 5 }, styles: { value: 60, blend: 35, growth: 5 }, div: 3.5, cagr: { '1y': 10, '3y': 7, '5y': 11 } },

    '488500': { name: 'TIGER 미국S&P500동일가중', symbol: '488500.KS', sectors: { tech: 11, finance: 15, health: 13, consumer_cyc: 11, ind: 15, communication: 4, consumer_def: 8, energy: 5, utilities: 6, basic: 6, realestate: 6 }, sizes: { large: 40, mid: 55, small: 5 }, styles: { value: 35, blend: 45, growth: 20 }, div: 1.5, cagr: { '1y': 15, '3y': 8, '5y': 11 } },
    '309230': { name: 'ACE 미국WideMoat동일가중', symbol: '309230.KS', sectors: { tech: 23, finance: 18, health: 16, consumer_cyc: 12, ind: 10, communication: 11, consumer_def: 5, energy: 1, utilities: 1, basic: 3, realestate: 0 }, sizes: { large: 50, mid: 45, small: 5 }, styles: { value: 40, blend: 40, growth: 20 }, div: 1.2, cagr: { '1y': 22, '3y': 11, '5y': 14 } },
    '461580': { name: 'KBSTAR 미국S&P500동일가중', symbol: '461580.KS', sectors: { tech: 11, finance: 15, health: 13, consumer_cyc: 11, ind: 15, communication: 4, consumer_def: 8, energy: 5, utilities: 6, basic: 6, realestate: 6 }, sizes: { large: 40, mid: 55, small: 5 }, styles: { value: 35, blend: 45, growth: 20 }, div: 1.5, cagr: { '1y': 15, '3y': 8, '5y': 11 } },
    '379800': { name: 'TIGER 미국MSCI우량가치', symbol: '379800.KS', sectors: { tech: 5, finance: 28, health: 14, consumer_cyc: 10, ind: 15, communication: 3, consumer_def: 9, energy: 10, utilities: 4, basic: 2, realestate: 0 }, sizes: { large: 80, mid: 20, small: 0 }, styles: { value: 85, blend: 15, growth: 0 }, div: 2.8, cagr: { '1y': 14, '3y': 7, '5y': 9 } },

    '381180': { name: 'TIGER 미국필라델피아반도체나스닥', symbol: '381180.KS', sectors: { tech: 98, finance: 0, health: 0, consumer_cyc: 2, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 88, mid: 12, small: 0 }, styles: { value: 0, blend: 10, growth: 90 }, div: 0.8, cagr: { '1y': 45, '3y': 18, '5y': 28 } },
    '465580': { name: 'TIGER 미국테크TOP10 INDXX', symbol: '465580.KS', sectors: { tech: 72, finance: 0, health: 0, consumer_cyc: 12, ind: 0, communication: 16, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 10, growth: 90 }, div: 0.5, cagr: { '1y': 48, '3y': 15, '5y': 24 } },
    '479490': { name: 'TIGER 미국빅테크TOP10+15%프리미엄', symbol: '479490.KS', sectors: { tech: 68, finance: 0, health: 0, consumer_cyc: 14, ind: 0, communication: 18, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 15, growth: 85 }, div: 15.0, cagr: { '1y': 25, '3y': 10, '5y': 15 } },
    '409820': { name: 'ACE 미국빅테크TOP7 Plus', symbol: '409820.KS', sectors: { tech: 78, finance: 0, health: 0, consumer_cyc: 11, ind: 0, communication: 11, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 5, growth: 95 }, div: 0.4, cagr: { '1y': 55, '3y': 20, '5y': 26 } },
    '453650': { name: 'KODEX 미국빅테크10(H)', symbol: '453650.KS', sectors: { tech: 70, finance: 0, health: 0, consumer_cyc: 13, ind: 0, communication: 17, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 10, growth: 90 }, div: 0.5, cagr: { '1y': 48, '3y': 15, '5y': 24 } },
    '443900': { name: 'ACE 미국반도체MV', symbol: '443900.KS', sectors: { tech: 99, finance: 0, health: 0, consumer_cyc: 1, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 92, mid: 8, small: 0 }, styles: { value: 0, blend: 5, growth: 95 }, div: 0.7, cagr: { '1y': 50, '3y': 19, '5y': 27 } },
    '390390': { name: 'TIGER 미국테크TOP10(H)', symbol: '390390.KS', sectors: { tech: 72, finance: 0, health: 0, consumer_cyc: 12, ind: 0, communication: 16, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 10, growth: 90 }, div: 0.5, cagr: { '1y': 48, '3y': 15, '5y': 24 } },
    '462340': { name: 'KODEX 미국반도체MV', symbol: '462340.KS', sectors: { tech: 99, finance: 0, health: 0, consumer_cyc: 1, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 92, mid: 8, small: 0 }, styles: { value: 0, blend: 5, growth: 95 }, div: 0.7, cagr: { '1y': 50, '3y': 19, '5y': 27 } },

    '481060': { name: 'ACE 미국빅테크TOP7 Plus레버리지(합성)', symbol: '481060.KS', sectors: { tech: 78, finance: 0, health: 0, consumer_cyc: 11, ind: 0, communication: 11, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 5, growth: 95 }, div: 0, cagr: { '1y': 95, '3y': 25, '5y': 40 } },
    '409850': { name: 'TIGER 미국나스닥100레버리지(합성)', symbol: '409850.KS', sectors: { tech: 51, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 1 }, sizes: { large: 96, mid: 4, small: 0 }, styles: { value: 5, blend: 25, growth: 70 }, div: 0, cagr: { '1y': 65, '3y': 15, '5y': 30 } },

    '473160': { name: 'TIGER 미국30년국채프리미엄액티브(H)', symbol: '473160.KS', sectors: { tech: 0, finance: 100, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 100, blend: 0, growth: 0 }, div: 12.0, cagr: { '1y': 2, '3y': 0, '5y': 2 } },
    '486290': { name: 'SOL 미국나스닥100커버드콜(합성)', symbol: '486290.KS', sectors: { tech: 51, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 1 }, sizes: { large: 96, mid: 4, small: 0 }, styles: { value: 30, blend: 50, growth: 20 }, div: 10.0, cagr: { '1y': 15, '3y': 8, '5y': 10 } },
    '479480': { name: 'TIGER 미국배당+7%프리미엄다우존스', symbol: '479480.KS', sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 }, sizes: { large: 70, mid: 25, small: 5 }, styles: { value: 70, blend: 25, growth: 5 }, div: 7.5, cagr: { '1y': 10, '3y': 6, '5y': 8 } },
    '463810': { name: 'KODEX 미국배당프리미엄다우존스', symbol: '463810.KS', sectors: { tech: 12, finance: 17, health: 15, consumer_cyc: 9, ind: 14, communication: 5, consumer_def: 13, energy: 10, utilities: 2, basic: 3, realestate: 0 }, sizes: { large: 70, mid: 25, small: 5 }, styles: { value: 70, blend: 25, growth: 5 }, div: 6.5, cagr: { '1y': 11, '3y': 7, '5y': 9 } },

    '462330': { name: 'KODEX 미국방산NYSE', symbol: '462330.KS', sectors: { tech: 5, finance: 0, health: 0, consumer_cyc: 0, ind: 90, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 5, realestate: 0 }, sizes: { large: 65, mid: 30, small: 5 }, styles: { value: 60, blend: 30, growth: 10 }, div: 1.2, cagr: { '1y': 22, '3y': 15, '5y': 18 } },
    '480310': { name: 'PLUS 미국AI반도체조장', symbol: '480310.KS', sectors: { tech: 99, finance: 0, health: 0, consumer_cyc: 1, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 90, mid: 10, small: 0 }, styles: { value: 0, blend: 5, growth: 95 }, div: 0.5, cagr: { '1y': 60, '3y': 25, '5y': 30 } },
    '441680': { name: 'TIGER 미국방산NYSE', symbol: '441680.KS', sectors: { tech: 5, finance: 0, health: 0, consumer_cyc: 0, ind: 90, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 5, realestate: 0 }, sizes: { large: 65, mid: 30, small: 5 }, styles: { value: 60, blend: 30, growth: 10 }, div: 1.2, cagr: { '1y': 22, '3y': 15, '5y': 18 } },
    '418660': { name: 'TIGER 미국필라델피아바이오', symbol: '418660.KS', sectors: { tech: 0, finance: 0, health: 98, consumer_cyc: 0, ind: 2, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 45, mid: 45, small: 10 }, styles: { value: 20, blend: 50, growth: 30 }, div: 0, cagr: { '1y': 5, '3y': -5, '5y': 2 } },
    '438150': { name: 'ACE 미국인프라S&P(합성)', symbol: '438150.KS', sectors: { tech: 2, finance: 5, health: 0, consumer_cyc: 3, ind: 45, communication: 0, consumer_def: 0, energy: 15, utilities: 25, basic: 5, realestate: 0 }, sizes: { large: 50, mid: 42, small: 8 }, styles: { value: 70, blend: 25, growth: 5 }, div: 2.5, cagr: { '1y': 8, '3y': 6, '5y': 8 } },
    '422910': { name: 'KODEX 미국종합채권SRI액티브(H)', symbol: '422910.KS', sectors: { tech: 0, finance: 100, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 100, blend: 0, growth: 0 }, div: 3.5, cagr: { '1y': 4, '3y': -1, '5y': 1 } },
    '474220': { name: 'SOL 미국AI소프트웨어', symbol: '474220.KS', sectors: { tech: 90, finance: 0, health: 0, consumer_cyc: 0, ind: 0, communication: 10, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 80, mid: 18, small: 2 }, styles: { value: 0, blend: 10, growth: 90 }, div: 0.2, cagr: { '1y': 35, '3y': 10, '5y': 15 } },
    '472140': { name: 'TIGER 미국테크TOP10채권혼합', symbol: '472140.KS', sectors: { tech: 32, finance: 55, health: 0, consumer_cyc: 5, ind: 0, communication: 8, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 90, mid: 10, small: 0 }, styles: { value: 60, blend: 20, growth: 20 }, div: 2.0, cagr: { '1y': 18, '3y': 7, '5y': 10 } },
    '415930': { name: 'KODEX 미국나스닥100채권혼합', symbol: '415930.KS', sectors: { tech: 23, finance: 56, health: 3, consumer_cyc: 6, ind: 2, communication: 7, consumer_def: 3, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 85, mid: 15, small: 0 }, styles: { value: 60, blend: 25, growth: 15 }, div: 2.2, cagr: { '1y': 15, '3y': 6, '5y': 9 } },
    '321410': { name: 'HANARO 미국S&P500', symbol: '321410.KS', sectors: { tech: 30, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 3 }, sizes: { large: 85, mid: 14, small: 1 }, styles: { value: 25, blend: 45, growth: 30 }, div: 1.3, cagr: { '1y': 25, '3y': 10, '5y': 14 } },
    '437540': { name: 'TIGER 미국선급기반대체자산(합성)', symbol: '437540.KS', sectors: { tech: 0, finance: 100, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 50, mid: 50, small: 0 }, styles: { value: 100, blend: 0, growth: 0 }, div: 5.0, cagr: { '1y': 8, '3y': 5, '5y': 6 } },
    '453690': { name: 'PLUS 미국S&P500', symbol: '453690.KS', sectors: { tech: 30, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 3 }, sizes: { large: 85, mid: 14, small: 1 }, styles: { value: 25, blend: 45, growth: 30 }, div: 1.3, cagr: { '1y': 25, '3y': 10, '5y': 14 } },
    '465320': { name: 'PLUS 미국나스닥100', symbol: '465320.KS', sectors: { tech: 50, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 2 }, sizes: { large: 95, mid: 5, small: 0 }, styles: { value: 5, blend: 25, growth: 70 }, div: 0.6, cagr: { '1y': 35, '3y': 12, '5y': 19 } },
    '334690': { name: 'KBSTAR 미국S&P500', symbol: '334690.KS', sectors: { tech: 30, finance: 13, health: 12, consumer_cyc: 10, ind: 9, communication: 8, consumer_def: 6, energy: 4, utilities: 3, basic: 2, realestate: 3 }, sizes: { large: 85, mid: 14, small: 1 }, styles: { value: 25, blend: 45, growth: 30 }, div: 1.3, cagr: { '1y': 25, '3y': 10, '5y': 14 } },
    '334700': { name: 'KBSTAR 미국나스닥100', symbol: '334700.KS', sectors: { tech: 50, finance: 1, health: 6, consumer_cyc: 13, ind: 5, communication: 15, consumer_def: 6, energy: 0, utilities: 1, basic: 1, realestate: 2 }, sizes: { large: 95, mid: 5, small: 0 }, styles: { value: 5, blend: 25, growth: 70 }, div: 0.6, cagr: { '1y': 35, '3y': 12, '5y': 19 } },
    '441670': { name: 'TIGER 미국투자등급회사채액티브(H)', symbol: '441670.KS', sectors: { tech: 0, finance: 100, health: 0, consumer_cyc: 0, ind: 0, communication: 0, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 100, blend: 0, growth: 0 }, div: 4.5, cagr: { '1y': 6, '3y': 1, '5y': 3 } },
    '449170': { name: 'KODEX 미국빅테크상위10선물', symbol: '449170.KS', sectors: { tech: 75, finance: 0, health: 0, consumer_cyc: 12, ind: 0, communication: 13, consumer_def: 0, energy: 0, utilities: 0, basic: 0, realestate: 0 }, sizes: { large: 100, mid: 0, small: 0 }, styles: { value: 0, blend: 5, growth: 95 }, div: 0.5, cagr: { '1y': 48, '3y': 15, '5y': 24 } }
  };

  const fetchYahooPrice = async (item) => {
    try {
      const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${item.symbol}?interval=1m&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && meta.regularMarketPrice !== undefined) {
          const price = meta.regularMarketPrice;
          const prevClose = meta.previousClose;
          const changeRaw = ((price - prevClose) / prevClose) * 100;
          // 💡 [패치 2] 절대 등락 금액(원) 계산 로직 추가
          const changeAmt = price - prevClose; 
          
          return {
            name: item.name, code: item.code, symbol: item.symbol,
            value: price.toLocaleString('ko-KR'), 
            change: Math.abs(changeRaw).toFixed(2) + '%', 
            changeAmt: Math.abs(changeAmt).toLocaleString('ko-KR', { maximumFractionDigits: 0 }), // 소수점 제거
            isUp: changeRaw >= 0,
            xray: item.xray
          };
        }
      }
    } catch (e) { console.error(`야후 API 파싱누락 (${item.symbol}):`, e); }
    return { name: item.name, code: item.code, symbol: item.symbol, value: '-', change: '0.00%', changeAmt: '0', isUp: null, xray: item.xray };
  };

  try {
    const poolItems = Object.entries(masterPool).map(([code, config]) => ({
      code, name: config.name, symbol: config.symbol, xray: config
    }));
    const fetchedPool = await Promise.all(poolItems.map(fetchYahooPrice));
    return NextResponse.json({ pool: fetchedPool });
  } catch (error) {
    return NextResponse.json({ error: 'ETF 마스터 풀 동기화 실패' }, { status: 500 });
  }
}