import { Mode } from '../../../constants/types'
import { MarketDataProviderBase } from '../../base/market-data'
import { Bar } from '../../base/models/bar'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { ProviderOptions } from '../../base/models/provider-options'
import { last, has } from 'lodash'
import config from '../../../../config'
import { HistoricalBarOptions, LiveBarOptions } from '../../base/models/options'
import { BinanceBar } from './binance.types'
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
            { value: '5m', label: '5 Minute' },
            { value: '15m', label: '15 Minute' },
            { value: '1d', label: '1 Day' }
        ]
        // override the max limit
        details.limit.templateOptions.max = 1000
        return details
    }

    translateBar(brokerBar: BinanceBar): Bar {
        const bar: Bar = {
            providerId: this.options.id,
            start: barEpochTimeToUTC(brokerBar.openTime),
            symbol: brokerBar.symbol,
            timeframe: brokerBar.interval,
            open: brokerBar.open,
            close: brokerBar.close,
            high: brokerBar.high,
            low: brokerBar.low,
            volume: brokerBar.volume,
            inProgress: has(brokerBar, 'isFinal') ? !brokerBar.isFinal : barEpochTimeToUTC(brokerBar.closeTime || 0).getTime() > new Date().getTime(),
            end: barEpochTimeToUTC(brokerBar.closeTime || 0),
        }
        return bar;
    }

    async getHistoricalBarData(options: HistoricalBarOptions): Promise<Bar[][]> {
        const finalOptions = this.translateHistoricalBarOptions(options)
        const finalSymbols = options.symbols || this.activeSymbols
        utils.logDetails(`getting bars from ${this.options.name}`, { timeframe: finalOptions.timeframe, options: finalOptions, symbols: finalSymbols });

        // builds a list of symbols each with a list of bars for that symbol
        const allBars = await Promise.all(finalSymbols.map(async (s) => {
            let brokerBars: any[] = [];
            let batch = await this.client.candles( { interval: finalOptions.timeframe, symbol: s, ...finalOptions });
            brokerBars = brokerBars.concat(batch);
            // banance only allows 1000 bars at a time, this will keep requesting until the entire request is made
            // TODO: implement throttling here to control number of calls made to the API
            while (batch.length === 1000 && (!finalOptions.limit || brokerBars.length < finalOptions.limit)) {
                const updatedOptions = {...finalOptions};
                updatedOptions.startTime = Number(last(brokerBars).openTime) + 1000;
                batch = await this.client.candles( { interval: finalOptions.timeframe, symbol: s, ...updatedOptions });
                brokerBars = brokerBars.concat(batch);
            }

            // filter out any bars that are still building
            return brokerBars.filter(b => b && b.openTime && b.openTime > 0).map(b => {
                b.symbol = s;
                b.interval = finalOptions.interval
                b.source = 'api'
                return this.translateBar(b);
            });
        }));

        // TODO: should these eventually fire events for each bar to act exactly like live trading?
        return allBars;
    }

    translateHistoricalBarOptions(options: HistoricalBarOptions): any {
        const finalOptions: any = {};

        if (options.startDate || options.afterDate) {
            finalOptions.startTime = new Date(options.startDate || options.afterDate || 0).getTime();
            finalOptions.endTime = (options.endDate) ? new Date(options.endDate).getTime() : utils.currentTime().getTime();
            if (!options.limit) finalOptions.limit = 1000;
        }

        // setting the default value in early stages
        finalOptions.interval = options.timeframe || '15m'
        
        if (options.limit) finalOptions.limit ? Math.min(options.limit, finalOptions.limit) : options.limit;

        return finalOptions;
    }

    async getLiveBarData(options: LiveBarOptions) {
        this.marketSocket = this.client.ws.candles(options.symbols || this.activeSymbols, options.timeframe || '1m', (event: any) => {
            switch (event.eventType) {
                case 'kline':
                    event.openTime = event.eventTime
                    const bar = this.translateBar(event)
                    bar.source = 'ws'
                    if (options.showActive || !bar.inProgress) console.log(bar)
                    break;
                default:
                    console.log(event)
            }
        });
    }

    stopMarketDataStream() {
        this.marketSocket();
    }

}
