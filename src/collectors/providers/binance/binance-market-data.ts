import { Mode } from '../../../constants/types'
import { MarketDataProviderBase } from '../../base/market-data-base'
import { Bar } from '../../base/models/bar'
import { OrderBook, BookLevel } from '../../base/models/order-book'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { ProviderOptions } from '../../base/models/provider-options'
import { last } from 'lodash'
import { HistoricalBarOptions, LiveBarOptions, LiveOrderBookOptions } from '../../base/models/options'
import { CandlesOptions, CandleChartInterval, Candle, CandleChartResult, Depth } from 'binance-api-node'


const Binance = require('binance-api-node').default

const utils = require('../../../utils/legacy.js')  // TODO: deprecate the legacy utils

export class BinanceMarketData extends MarketDataProviderBase {

    constructor(options: ProviderOptions, mode: Mode) {
        const client = new Binance(options.apiOptions)  // TODO: pull the provider dynamically
        super(options, mode, client)
    }

    static parameterDetails() {
        const details = {...MarketDataProviderBase.parameterDetails() }
        details.interval.templateOptions.options = [
            { value: '1m', label: '1 Minute' },
            { value: '3m', label: '3 Minute' },
            { value: '5m', label: '5 Minute' },
            { value: '15m', label: '15 Minute' },
            { value: '30m', label: '30 Minute' },
            { value: '1h', label: '1 Hour' },
            { value: '2h', label: '2 Hour' },
            { value: '4h', label: '4 Hour' },
            { value: '6h', label: '6 Hour' },
            { value: '8h', label: '8 Hour' },
            { value: '12h', label: '12 Hour' },
            { value: '1d', label: '1 Day' },
            { value: '3d', label: '3 Day' },
            { value: '1w', label: '1 Week' },
            { value: '1M', label: '1 Month' }
        ]
        details.limit.templateOptions.max = 1000
        return details
    }


    // Bar Translations

    /**
     * Translate common properties from live and historical bar data into a partial platform bar
     * @param brokerBar bar data from binance (live or historical)
     */
    _commonBarTranslations(brokerBar: Candle | CandleChartResult): Partial<Bar> {
        const bar: Partial<Bar> = {}
        bar.providerId = this.options.id
        bar.open = Number(brokerBar.open)
        bar.close = Number(brokerBar.close)
        bar.high = Number(brokerBar.high)
        bar.low = Number(brokerBar.low)
        bar.volume = Number(brokerBar.volume)
        bar.trades = brokerBar.trades
        return bar
    }

    /**
     * Translates historical bar data from binance to platform bar
     * @param brokerBar bar data from binance (historical)
     * @param timeframe timeframe for the bar (not provided in historical)
     * @param symbol    symbol for bar (not provided in historical)
     * @param start     start
     */
    translateHistoricalBar(brokerBar: CandleChartResult, timeframe: string, symbol: string): Bar {
        const bar: Partial<Bar> = this._commonBarTranslations(brokerBar);
        bar.source = 'historical'
        bar.end = barEpochTimeToUTC(brokerBar.closeTime || 0)
        bar.timeframe = timeframe
        bar.symbol = symbol
        bar.start = barEpochTimeToUTC(brokerBar.openTime)
        bar.inProgress = barEpochTimeToUTC(brokerBar.closeTime || 0).getTime() > new Date().getTime()
        return <Bar>bar;
    }

    /**
     * Translates live bar data from binance to platform bar
     * @param brokerBar live bar data from binance
     */
    translateLiveBar(brokerBar: Candle): Bar {
        const bar: Partial<Bar> = this._commonBarTranslations(brokerBar)
        bar.source = 'live'
        bar.start = barEpochTimeToUTC(brokerBar.startTime)
        bar.end = barEpochTimeToUTC(brokerBar.closeTime)
        bar.symbol = brokerBar.symbol,
            bar.timeframe = brokerBar.interval,
            bar.inProgress = !brokerBar.isFinal
        return <Bar>bar;
    }

    /**
     * Pulls historica bar data from binance apis
     * @param options parameters for historical bar options
     */
    async getHistoricalBarData(options: HistoricalBarOptions): Promise<void> {
        const finalOptions = this.translateHistoricalBarOptions(options)
        const finalSymbols = options.symbols || this.activeSymbols
        utils.logDetails(`getting bars from ${this.options.name}`, { options: finalOptions, symbols: finalSymbols });

        // builds a list of symbols each with a list of bars for that symbol
        await Promise.all(finalSymbols.map(async (s) => {
            finalOptions.symbol = s
            let batch: CandleChartResult[] = await this.client.candles({ ...finalOptions })
            this._sendBarBatchEvents(batch, finalOptions.interval, s)
            let barCount = batch.length

            // banance only allows 1000 bars at a time, this will keep requesting until the entire request is made
            // TODO: implement throttling here to control number of calls made to the API
            while (batch.length === 1000 && (!finalOptions.limit || barCount < finalOptions.limit)) {
                const updatedOptions = { ...finalOptions };
                // change startTime to 1s after last bar receieved
                updatedOptions.startTime = Number((last(batch) as CandleChartResult).openTime) + 1000
                updatedOptions.symbol = s
                batch = await this.client.candles({ ...updatedOptions });
                this._sendBarBatchEvents(batch, finalOptions.interval, s)
                barCount += batch.length;
            }
        }));

        return
    }

    _sendBarBatchEvents(bars: any, interval: string, symbol: string): void {
        bars.filter((b: any) => b && b.openTime && b.openTime > 0).forEach((b: any) => {
            this.emitter(`${symbol}.bar`, this.translateHistoricalBar(b, interval, symbol)) // TODO: consider moving the emit to the base class to make provider more generic
        })
    }

    /**
     * Translates platform HistoricalBarOptions to binance specific CandleOptions
     * @param options platform version of historical bar options
     */
    translateHistoricalBarOptions(options: HistoricalBarOptions): CandlesOptions {
        let finalOptions: Partial<CandlesOptions> = {};

        finalOptions.interval = <CandleChartInterval>options.timeframe || '1h'

        if (options.startDate || options.afterDate) {
            finalOptions.startTime = new Date(options.startDate || options.afterDate || 0).getTime();
            finalOptions.endTime = (options.endDate) ? new Date(options.endDate).getTime() : utils.currentTime().getTime();
        }

        // carry over the limit if it's provided (uses binance default if not specified)
        if (options.limit) finalOptions.limit = options.limit

        return <CandlesOptions>finalOptions;
    }


    /**
     * Starts streaming live bar data from binance
     * @param options platforms LiveBarOptions
     */
    async getLiveBarData(options: LiveBarOptions): Promise<void> {
        this.socketClient = this.client.ws.candles(options.symbols || this.activeSymbols, options.timeframe || '1m', (event: Candle) => {
            switch (event.eventType) {
                case 'kline':
                    const bar: Bar = this.translateLiveBar(event)
                    if (options.showActive || !bar.inProgress) this.emitter(`${bar.symbol}.bar`, bar)
                    break
                default:
                    console.log(`untracked websocket event`)
                    console.log(event)
            }
        });
        return this.socketClient
    }


    // OrderBook translations

    /**
     * Translate live order book data from binance to platform order book
     * @param depth order book depth data from binance
     */
    translateLiveOrderBook(depth: Depth): OrderBook {
        const book: Partial<OrderBook> = {}
        book.providerId = this.options.id
        book.source = 'live'
        book.symbol = depth.symbol
        book.eventTime = new Date(depth.eventTime)
        book.bids = depth.bidDepth.filter(b => Number(b.quantity) > 0).map(b => <BookLevel>{ price: Number(b.price), quantity: Number(b.quantity) })
        book.asks = depth.askDepth.filter(a => Number(a.quantity) > 0).map(a => <BookLevel>{ price: Number(a.price), quantity: Number(a.quantity) })
        return <OrderBook>book
    }

    async getLiveOrderBook(options: LiveOrderBookOptions): Promise<void> {
        this.socketClient = this.client.ws.depth(options.symbols, (event: Depth) => {
            switch (event.eventType) {
                case 'depthUpdate':
                    const book = this.translateLiveOrderBook(event)
                    if (book.bids.length > 0 && book.asks.length > 0) {
                        this.emitter(`${book.symbol}.book`, book)
                    }
                    break;
                default:
                    console.log(`untracked websocket event`)
                    console.log(event)
            }
        })
    }

    stopMarketDataStream() {
        this.socketClient();
    }
}
