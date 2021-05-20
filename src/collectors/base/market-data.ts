import { ProviderOptions } from './models/provider-options'
import { Mode } from '../../constants/types'
import { indexOf } from 'lodash'
import { HistoricalBarOptions, LiveBarOptions } from './models/options'

export class MarketDataProviderBase {
    options: ProviderOptions
    mode: Mode
    client: any
    isActive: boolean = false
    activeSymbols: string[] = []
    marketSocket: any


    constructor(options: ProviderOptions, mode: Mode, client: any) {
        this.options = options
        this.mode = mode
        this.client = client
    }

    /**
     * Returns parameter details for this Provider
     */
    static parameterDetails(): any {
        return {
            interval: {
                type: 'select',
                templateOptions: {
                    label: 'Bar TimeFrame to Trade',
                    description: 'Timeframe in bars for this strategy',
                    required: true,
                    defaultValue: '1d',
                    options: [
                        { value: '1m', label: '1 Minute' },
                        { value: '5m', label: '5 Minute' },
                        { value: '15m', label: '15 Minute' },
                        { value: '1h', label: '1 Hour' },
                        { value: '1d', label: '1 Day' }
                    ]
                }
            },
            limit: {
                type: 'input',
                templateOptions: {
                    label: 'Backtest Bar Limit',
                    description: 'Number of Bars to Pull for Testing',
                    required: false,
                    min: 1,
                    max: 1000
                }
            },
            afterDate: {
                type: 'input',
                templateOptions: {
                    label: 'BackTest After Date',
                    description: 'Pull all bars after this date to the current',
                    required: false
                }
            },
            startDate: {
                type: 'input',
                templateOptions: {
                    label: 'BackTest Start Date',
                    description: 'Pull all bars starting with this date',
                    required: false
                }
            },
            endDate: {
                type: 'input',
                templateOptions: {
                    label: 'BackTest End Date',
                    description: 'Pull all bars ending with this date',
                    required: false
                }
            }
        }
    }

    /**
     * Run processes to setup the market data provider
     */
    async initialize(): Promise<boolean> {
        return this.healthCheck();
    }

    /**
     * Run processes prior to closing down the market data provider
     */
    async finalize(): Promise<null> {
        return this.marketSocket()
    }

    /**
     * Ping market data provider to ensure connection is established
     */
    async healthCheck(): Promise<boolean> {
        this.isActive = false;
        return this.isActive;
    }

    /**
       * Register a symbol (or list of symbols) to include when pulling data
       * @param symbol the symbol (or symbols) to pull
       */
    async registerSymbol(symbol: string) {
        if (indexOf(this.activeSymbols, symbol) < 0) {
            this.activeSymbols.push(symbol);
        }
        return;
    }

    /**
       * Converts broker specific bar/candlestick to platform specific
       * @param brokerBar the broker bar to convert
       */
    translateBar(brokerBar: any): void { }

    /**
     * Pull historical bar data from API returning as a list of lists (Bar[symbol][bars])
     * @param options options for requesting bars from an api
     */
    getHistoricalBarData(options: HistoricalBarOptions): void { }

    /**
     * Open socket to live bar data
     * @param options options for requesting bars from a websocket
     */
    getLiveBarData(options: LiveBarOptions): void { }

    // TODO: getLiveTradeData()
    // TODO: getLiveOrderbookData()
}
