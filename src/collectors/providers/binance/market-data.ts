import { MarketDataProviderBase } from '../../base/market-data'
import { MarketDataConnection } from '../../base/models/market-data'
import { Bar } from '../../base/models/bar'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'
import { ProviderOptions } from '../../base/models/provider-options'
import config from '../../../../config'
const Binance = require('binance-api-node').default

export class BinanceMarketData extends MarketDataProviderBase implements MarketDataConnection {
    client: any

    constructor (options: ProviderOptions) {
        super(options)
        this.client = new Binance(config.providers.binance_live)
    }

    translateBar (brokerBar: any): Bar {
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
}
