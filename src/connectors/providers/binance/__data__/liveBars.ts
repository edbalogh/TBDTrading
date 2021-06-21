import { Candle } from 'binance-api-node'

export const LIVE_BAR: Candle = {
    eventType: 'kline',
    eventTime: 1621629665609,
    symbol: 'DOGEUSDT',
    startTime: 1621629660000,
    closeTime: 1621629719999,
    firstTradeId: 4922224,
    lastTradeId: 4922231,
    open: '0.34193130',
    high: '0.34211330',
    low: '0.34144410',
    close: '0.34169870',
    volume: '4438.00000000',
    trades: 8,
    interval: '1m',
    isFinal: false,
    quoteVolume: '1517.15045100',
    buyVolume: '2269.00000000',
    quoteBuyVolume: '776.08806770'
}

export function buildLiveBar(overrides?: Partial<Candle>): Candle {
    return { ...<any>LIVE_BAR, ...<any>overrides } as Candle
}