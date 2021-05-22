import { Mode } from '../../../constants/types'
import { MarketDataProviderBase } from '../../base/market-data'
import { Bar } from '../../base/models/bar'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { ProviderOptions } from '../../base/models/provider-options'
import { last } from 'lodash'
import config from '../../../../config'
import { HistoricalBarOptions, LiveBarOptions } from '../../base/models/options'
import { CandlesOptions, CandleChartInterval, Candle, CandleChartResult } from 'binance-api-node'
const Binance = require('binance-api-node').default

const utils = require('../../../utils/legacy.js')  // TODO: deprecate the legacy utils

export class BinanceMarketData extends MarketDataProviderBase {

    constructor(options: ProviderOptions, mode: Mode) {
        const client = new Binance(config.providers.binance_live)
        super(options, mode, client)
    }

    parameterDetails() {
        const details = MarketDataProviderBase.parameterDetails();
        // override the interval options
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
        // override the max limit
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
        bar.symbol = brokerBar.symbol,
        bar.timeframe = brokerBar.interval,
        bar.inProgress = !brokerBar.isFinal         
        return <Bar>bar;
    }

    /**
     * Pulls historica bar data from binance apis
     * @param options parameters for historical bar options
     */
    async getHistoricalBarData(options: HistoricalBarOptions): Promise<Bar[][]> {
        const finalOptions = this.translateHistoricalBarOptions(options)
        const finalSymbols = options.symbols || this.activeSymbols
        utils.logDetails(`getting bars from ${this.options.name}`, { options: finalOptions, symbols: finalSymbols });

        // builds a list of symbols each with a list of bars for that symbol
        const allBars = await Promise.all(finalSymbols.map(async (s) => {
            let brokerBars: any[] = [];
            finalOptions.symbol = s
            let batch = await this.client.candles( { ...finalOptions });
            brokerBars = brokerBars.concat(batch);
            // banance only allows 1000 bars at a time, this will keep requesting until the entire request is made
            // TODO: implement throttling here to control number of calls made to the API
            while (batch.length === 1000 && (!finalOptions.limit || brokerBars.length < finalOptions.limit)) {
                const updatedOptions = {...finalOptions};
                updatedOptions.startTime = Number(last(brokerBars).openTime) + 1000;
                updatedOptions.symbol = s
                batch = await this.client.candles( { ...updatedOptions });
                brokerBars = brokerBars.concat(batch);
            }

            // filter out any bars that are still building
            return brokerBars.filter(b => b && b.openTime && b.openTime > 0).map(b => {
                return this.translateHistoricalBar(b, finalOptions.interval, s);
            });
        }));

        // TODO: should these eventually fire events for each bar to act exactly like live trading?
        return allBars;
    }

    /**
     * Translates platform HistoricalBarOptions to binance specific CandleOptions
     * @param options platform version of historical bar options
     */
    translateHistoricalBarOptions(options: HistoricalBarOptions): CandlesOptions {
        let finalOptions: Partial<CandlesOptions> = {};

        if (options.startDate || options.afterDate) {
            finalOptions.startTime = new Date(options.startDate || options.afterDate || 0).getTime();
            finalOptions.endTime = (options.endDate) ? new Date(options.endDate).getTime() : utils.currentTime().getTime();
            if (!options.limit) finalOptions.limit = 1000;
        }

        // setting the default value in early stages
        finalOptions.interval = <CandleChartInterval> (options.timeframe || '15m')
        
        if (options.limit) finalOptions.limit ? Math.min(options.limit, finalOptions.limit) : options.limit;

        return <CandlesOptions> finalOptions;
    }

    /**
     * Starts streaming live bar data from binance
     * @param options platforms LiveBarOptions
     */
    async getLiveBarData(options: LiveBarOptions) {
        this.marketSocket = this.client.ws.candles(options.symbols || this.activeSymbols, options.timeframe || '1m', (event: any) => {
            switch (event.eventType) {
                case 'kline':
                    const bar = this.translateLiveBar(event)
                    if (options.showActive || !bar.inProgress) console.log(bar)
                    break;
                default:
                    console.log(`untracked websocket event: ${event}`)
            }
        });
    }

    stopMarketDataStream() {
        this.marketSocket();
    }

}
