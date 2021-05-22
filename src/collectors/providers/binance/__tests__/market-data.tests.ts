import { BinanceMarketData } from '../market-data'
import { Candle, CandleChartResult } from 'binance-api-node'
import { buildHistoricalBar } from '../__data__/historicalBars'
import { buildLiveBar } from '../__data__/liveBars'

describe("BinanceMarketData Historical Bar tests", () => {   

    it('should translate historical bars', () => {
        const bmd = new BinanceMarketData({ id: 'test', providerType: 'MarketData', name: 'test' }, 'BACKTEST')
        const testBar = buildHistoricalBar()
        const histBar = bmd.translateHistoricalBar(testBar, '1m', 'DOGEUSDT')
        expect(histBar.start).toStrictEqual(new Date(1610370000000))
        expect(histBar.end).toStrictEqual(new Date(1610373599999))
        expect(histBar.symbol).toBe('DOGEUSDT')
        expect(histBar.open).toBe(0.0088409)
        expect(histBar.high).toBe(0.0089405)
        expect(histBar.low).toBe(0.0082291)
        expect(histBar.close).toBe(0.0083466)
        expect(histBar.volume).toBe(1815853)
        expect(histBar.trades).toBe(79)
        expect(histBar.inProgress).toBe(false)
        expect(histBar.timeframe).toBe('1m')
        expect(histBar.providerId).toBe('test')
        expect(histBar.source).toBe('historical')
        const testBar2 = buildHistoricalBar({ closeTime: new Date().getTime() + 1000 })
        const histBar2 = bmd.translateHistoricalBar(testBar2, '1D', 'DOGEUSDT')
        expect(histBar2.inProgress).toBe(true)
    })

    test('should get historical bar data', async () => {
        const bmd = new BinanceMarketData({ id: 'test', providerType: 'MarketData', name: 'test' }, 'BACKTEST')
        const currTime = new Date().getTime()
        bmd.client.candles = jest.fn()
            .mockResolvedValueOnce([ buildHistoricalBar() ])
            .mockResolvedValueOnce([
                buildHistoricalBar({ openTime: currTime - 2000, closeTime: currTime - 1001}),
                buildHistoricalBar({ openTime: currTime - 1000, closeTime: currTime - 1})
            ])

        const bars = await bmd.getHistoricalBarData({ timeframe: '1m', symbols: ['ADAUSDT', 'ONEUSDT'] })
        expect(bars).toHaveLength(2)
        expect(bars[0]).toHaveLength(1)
        expect(bars[1]).toHaveLength(2)
        expect(bars[0].filter(x => x.symbol === 'ADAUSDT')).toHaveLength(1)
        expect(bars[1].filter(x => x.symbol === 'ONEUSDT')).toHaveLength(2)
        expect(bmd.client.candles).toHaveBeenCalledTimes(2)
    })

    test('should translate historical bar options', () => {

    })
})

describe('BinanceMarketData Live Bar tests', () => {
    test("should translate live bars", () => {
        const bmd = new BinanceMarketData({ id: 'test', providerType: 'MarketData', name: 'test' }, 'BACKTEST')
        const liveBar = buildLiveBar()
        const stdBar = bmd.translateLiveBar(liveBar)
        expect(stdBar.providerId).toBe('test')
        expect(stdBar.start).toBeDefined()
        expect(stdBar.timeframe).toBe(liveBar.interval)
        // TODO: finish this up
    })

    test("should stream live bar data", () => {

    })
})
