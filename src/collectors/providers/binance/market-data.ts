import { Mode } from '../../../constants/types'
import { MarketDataProviderBase } from '../../base/market-data'
import { Bar } from '../../base/models/bar'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { ProviderOptions } from '../../base/models/provider-options'
import { last } from 'lodash'
import config from '../../../../config'
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

    translateBar(brokerBar: any): Bar {
        const bar: Bar = {
            providerId: this.options.id,
            start: barEpochTimeToUTC(brokerBar.startTime),
            symbol: brokerBar.symbol,
            timeframe: brokerBar.interval,
            open: brokerBar.open,
            close: brokerBar.close,
            high: brokerBar.high,
            low: brokerBar.low,
            volume: brokerBar.volume,
            inProgress: !brokerBar.isFinal, // barEpochTimeToUTC(brokerBar.closeTime).getTime() > new Date().getTime(),
            end: brokerBar.closeTime,
        }
        return bar;
    }

    async getHistoricalBarData(barOptions: any): Promise<Bar[][]> {
        const finalOptions = this.translateHistoricalBarOptions(barOptions)
        utils.logDetails(`getting bars from ${this.options.name}`, { timeframe: finalOptions.timeframe, options: finalOptions, symbols: this.activeSymbols });

        // builds a list of symbols each with a list of bars for that symbol
        const allBars = await Promise.all(this.activeSymbols.map(async (s) => {
            let brokerBars: any[] = [];
            let batch = await this.client.candles( { interval: finalOptions.timeframe, symbol: s, ...finalOptions });
            brokerBars = brokerBars.concat(batch);
            // banance only allows 1000 bars at a time, this will keep requesting until the entire request is made
            // TODO: implement throttling here to control number of calls made to the API
            while (batch.length === 1000 && (!barOptions.limit || brokerBars.length < barOptions.limit)) {
                const updatedOptions = {...finalOptions};
                updatedOptions.startTime = Number(last(brokerBars).openTime) + 1000;
                batch = await this.client.candles( { interval: finalOptions.timeframe, symbol: s, ...updatedOptions });
                brokerBars = brokerBars.concat(batch);
            }

            // filter out any bars that are still building
            return brokerBars.filter(b => b && b.openTime && b.openTime > 0).map(b => {
                b.symbol = s;
                return this.translateBar(b);
            });
        }));

        // TODO: should these eventually fire events for each bar to act exactly like live trading?
        return allBars;
    }

    translateHistoricalBarOptions(barOptions: any): any {
        const finalOptions: any = {};

        if (barOptions.startDate) {
            finalOptions.startTime = new Date(barOptions.startDate).getTime();
            finalOptions.endTime = (barOptions.endDate) ? new Date(barOptions.endDate).getTime() : utils.currentTime().getTime();
            if (!barOptions.limit) finalOptions.limit = 1000;
        }

        // setting the default value in early stages
        finalOptions.timeframe = barOptions.timeframe || '15m'
        
        if (barOptions.limit) finalOptions.limit ? Math.min(barOptions.limit, finalOptions.limit) : barOptions.limit;
    }

    async getLiveBarData(options: any) {
        this.marketSocket = this.client.ws.candles(options.symbols || this.activeSymbols, options.timeframe || '1m', (event: any) => {
            switch (event.eventType) {
                case 'kline':
                    const bar = this.translateBar(event)
                    console.log(bar)
                    break
                default:
                    console.log(event)
            }
        });
    }

    stopMarketDataStream() {
        this.marketSocket();
    }

    stopUserDataStream() {
        this.userSocket();
    }

    stopStreams() {
        this.stopMarketDataStream();
        this.stopUserDataStream();
    }

}
