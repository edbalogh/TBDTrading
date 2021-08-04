import { Mode } from '../../../common/definitions/basic'
import { MarketDataProviderBase } from '../../base/market-data-base'
import { Bar, HistoricalBarOptions, OrderBook, BookLevel } from '../../../common/definitions/market-data'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { ProviderOptions, LiveBarOptions, LiveOrderBookOptions, LiveTradeOptions } from '../../../common/definitions/connectors'
import { last } from 'lodash'
import { string } from 'yargs'

const utils = require('../../../utils/legacy.js')  // TODO: deprecate the legacy utils

export class KucoinMarketData extends MarketDataProviderBase {
    providerSocket: any

    constructor(options: ProviderOptions, mode: Mode) {
        super(options, mode)

        // initialize spot client
        if (options.apiOptions.spot) {
            this.spotApi = require('kucoin-node-api')
            this.spotApi.init(options.apiOptions.spot)
            this.spotEnabled = true
        }

        // initialize futures client
        // if (options.apiOptions.futures) {
        //     this.futuresApi = require('kucoin-futures-node-api')
        //     this.futuresApi.init(options.apiOptions.futures)
        //     this.futuresEnabled = true
        // }

        // // if apiOptions are at the root (similar to other implementations), create the spot client
        // if (!this.spotApi && !this.futuresApi) {
        //     console.log('using apiOptions to create spot client')
        //     this.spotApi = require('kucoin-node-api')
        //     this.spotApi.init(options.apiOptions)
        //     this.spotEnabled = true
        // }
    }

    static parameterDetails() {
        const details = { ...MarketDataProviderBase.parameterDetails() }
        details.interval.templateOptions.options = [
            { value: '1min', label: '1 Minute' },
            { value: '3min', label: '3 Minute' },
            { value: '5min', label: '5 Minute' },
            { value: '15min', label: '15 Minute' },
            { value: '30min', label: '30 Minute' },
            { value: '1hout', label: '1 Hour' },
            { value: '2hout', label: '2 Hour' },
            { value: '4hout', label: '4 Hour' },
            { value: '6hour', label: '6 Hour' },
            { value: '8hour', label: '8 Hour' },
            { value: '12hour', label: '12 Hour' },
            { value: '1day', label: '1 Day' },
            { value: '1w', label: '1 Week' }
        ]
        details.limit.templateOptions.max = 1500
        return details
    }


    // Bar Translations

    /**
     * Translate common properties from live and historical bar data into a partial platform bar
     * @param brokerBar bar data from kucoin (live or historical)
     */
    translateBrokerBar(brokerBar: any, symbol: string, timeframe: string, source: 'historical' | 'live'): Bar {
        return {
            providerId: this.options.id,
            source: source,
            symbol: symbol,
            timeframe: timeframe,
            inProgress: false,
            start: barEpochTimeToUTC(brokerBar[0]),
            open: Number(brokerBar[1]),
            close: Number(brokerBar[2]),
            high: Number(brokerBar[3]),
            low: Number(brokerBar[4]),
            volume: Number(brokerBar[6]),
            trades: 0
        }
    }

    /**
     * Pulls historica bar data from kucoin apis
     * @param options parameters for historical bar options
     */
    async getHistoricalBarData(options: HistoricalBarOptions): Promise<void> {
        const finalOptions = this.translateHistoricalBarOptions(options)
        const finalSymbols = options.symbols || this.activeSymbols
        utils.logDetails(`getting bars from ${this.options.name}`, { options: finalOptions, symbols: finalSymbols });

        // builds a list of symbols each with a list of bars for that symbol
        await Promise.all(finalSymbols.map(async (s) => {
            finalOptions.symbol = s
            let batch: any[] = await this.spotApi.getKlines({ ...finalOptions })
            this._sendBarBatchEvents(batch, finalOptions.interval, s)
            let barCount = batch.length

            // number of bars returned is limited by api, this will keep requesting until the entire request is made
            // TODO: implement throttling here to control number of calls made to the API
            while (batch.length >= 1500) {
                const updatedOptions = { ...finalOptions };
                // change startTime to 1s after last bar receieved
                updatedOptions.startTime = Number(last(batch)[0]) + 1000
                updatedOptions.symbol = s
                batch = await this.spotApi.getKlines({ ...updatedOptions });
                this._sendBarBatchEvents(batch, finalOptions.interval, s)
                barCount += batch.length;
            }
        }));

        return
    }

    _sendBarBatchEvents(bars: any, interval: string, symbol: string): void {
        bars.filter((b: any) => b[0] > 0).forEach((b: any) => {
            super.handleBarEvent(this.translateBrokerBar(b, interval, symbol, 'historical'), {})
        })
    }

    /**
     * Translates platform HistoricalBarOptions to kucoin specific CandleOptions
     * @param options platform version of historical bar options
     */
    translateHistoricalBarOptions(options: HistoricalBarOptions): any {
        let finalOptions: any = {};

        finalOptions.type = options.timeframe

        if (options.startDate || options.afterDate) {
            finalOptions.startAt = new Date(options.startDate || options.afterDate || 0).getTime();
            finalOptions.endAt = (options.endDate) ? new Date(options.endDate).getTime() : utils.currentTime().getTime();
        }

        return finalOptions;
    }

    /**
     * Starts streaming live bar data from kucoin
     * @param options platforms LiveBarOptions
     */
    lastBarUpdate: Map<string, Bar> = new Map()
    addProviderBarSubscriptions(options: LiveBarOptions): void {
        console.log('AddBarSubscriptions', options)
        const timeframe = options.timeframe || '1hour'
        this.providerSocket = this.spotApi.initSocket({ topic: 'candles', symbols: options.symbols || this.activeSymbols, timeframe }, (eventJson: any) => {
            const event = JSON.parse(eventJson)
            if(!event.subject) {
                console.log(`no event.subject`, event.subject, event.data, event['subject'])
                return
            }
            let translatedBar
            switch (event.subject) {
                case 'trade.candles.update':
                    translatedBar = this.translateBrokerBar(event.data.candles, event.data.symbol, timeframe, 'live')
                    translatedBar.inProgress = true
                    this.lastBarUpdate.set(event.data.topic, translatedBar)
                    super.handleBarEvent(translatedBar, options)
                    break
                case 'trade.candles.add':
                    translatedBar = this.translateBrokerBar(event.data.candles, event.data.symbol, timeframe, 'live')
                    let barToSend = translatedBar
                    if (this.lastBarUpdate.get(event.data.topic)) {
                        barToSend = <Bar>this.lastBarUpdate.get(event.data.topic)
                        barToSend.inProgress = false
                    }
                    console.log('bar.add', barToSend)
                    super.handleBarEvent(<Bar>barToSend, options)
                    break
                default:
                    console.log(`untracked websocket event`)
                    console.log(event)
            }
        });
    }


    // OrderBook translations

    /**
     * Translate live order book data from kucoin to platform order book
     * @param depth order book depth data from kucoin
     */
    translateLiveOrderBook(event: any): OrderBook {
        const book: Partial<OrderBook> = {}
        book.providerId = this.options.id
        book.source = 'live'
        book.symbol = event.topic.split(':')[-1]
        book.eventTime = new Date(event.data.timestamp)
        book.bids = event.data.bids.map((b: any) => <BookLevel>{ price: Number(b[0]), quantity: Number(b[1]) })
        book.asks = event.data.asks.map((a: any) => <BookLevel>{ price: Number(a[0]), quantity: Number(a[1]) })
        return <OrderBook>book
    }

    addProviderBookSubscriptions(options: LiveOrderBookOptions): any {
        console.log('addProviderBookSubscriptions')
        this.providerServer = this.spotApi.initSocket({ topic: 'depth5', symbols: options.symbols }, (eventJson: any) => {
            const event = JSON.parse(eventJson)
            switch (event.subject) {
                case 'level2':
                    super.handleOrderBookEvent(this.translateLiveOrderBook(event))
                    break
                default:
                    console.log(`untracked websocket event`)
                    console.log(event)
            }
        })
    }

    stopMarketDataStream() {
        this.providerServer?.close()
    }
}

module.exports = KucoinMarketData