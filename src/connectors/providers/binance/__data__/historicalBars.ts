import { CandleChartResult } from 'binance-api-node'

export const HISTORICAL_BAR: CandleChartResult = {
    openTime: 1610370000000,
    open: '0.00884090',
    high: '0.00894050',
    low: '0.00822910',
    close: '0.00834660',
    volume: '1815853.00000000',
    closeTime: 1610373599999,
    quoteVolume: '15451.92061440',
    trades: 79,
    baseAssetVolume: '1264362.00000000',
    quoteAssetVolume: '10832.66332090'
}

export function buildHistoricalBar(overrides?: Partial<CandleChartResult>): CandleChartResult {
    return { ...<any>HISTORICAL_BAR, ...<any>overrides } as CandleChartResult
}
