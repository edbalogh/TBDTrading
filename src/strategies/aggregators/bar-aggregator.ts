import { Bar } from "../../common/definitions/market-data"
import { forOwn, size, takeRight } from "lodash"
import * as ti from "technicalindicators"
import * as shortid from "shortid"
import { upsert } from '../../mongo/mongo-utils'

export interface BarAggregatorOptions {
    mode: String,
    botId: String,
    symbol: String,
    timeframe: String,
    bulkUpdates?: Boolean,
    bulkSaveLimit?: number,
    bulkMinToKeep?: number,
    barsToPrime?: number,
    indicatorSettings?: any
}

export interface AggregatedBar extends Bar {
    mode: String,
    botId: String,
    id: String,
    processTime: Date,
    indicators: any
}

export class BarAggregator {
    mode: String
    botId: String
    symbol: String
    timeframe: String
    bulkSaveLimit: number
    bulkUpdates: Boolean
    bulkMinToKeep: number
    barsToPrime: number
    ready: Boolean = false
    indicatorSettings: any
    bars: Array<AggregatedBar> = []
    _indicators: any = {}
    activeBar?: AggregatedBar

    constructor(options: BarAggregatorOptions) {
        this.mode = options.mode;
        this.botId = options.botId;
        this.symbol = options.symbol;
        this.timeframe = options.timeframe;     // 1Min, 5Min, 15Min, 1D
        this.bulkUpdates = options.bulkUpdates || false
        this.bulkSaveLimit = options.bulkSaveLimit || 200;
        this.bulkMinToKeep = options.bulkMinToKeep || 20;

        this.ready = false;
        this.barsToPrime = options.barsToPrime || 30;      // TODO: this needs to be equal to the longest period needed for indicators       

        this.indicatorSettings = options.indicatorSettings || this.getDefaultIndicatorSettings();
        this._indicators = {};  // internal indicators object used for storing working indicators
        this.initializeIndicators();
        ti.setConfig('precision', 4);

        // console.log(`registering bars,symbol=${symbol},timeframe=${timeframe},executionId=${executionId},bulkDataUpdates=${this.bulkDataUpdates}`);
    }

    async initialize() {

    }

    initializeIndicators() {
        forOwn(this.indicatorSettings, (i, name) => {
            const options: any = {};
            forOwn(i, (v, k) => {
                if (k !== 'type') {
                    if (typeof (v) === 'object' && 'barData' in v) {
                        options[k] = [];
                    } else {
                        options[k] = v;
                    }
                }
            });

            let indicator = this.getProperty(ti, i.type)

            if(indicator) this._indicators[name] = new indicator(options)
        });
    }

    async updateBars(bar: Bar): Promise<AggregatedBar | void> {
        const aggBar = <AggregatedBar>{ ...bar }
        aggBar.mode = this.mode;
        aggBar.id = shortid.generate();
        aggBar.processTime = new Date();
        aggBar.botId = this.botId;
        aggBar.indicators = this._updateIndicators(aggBar);        

        if (!this.ready && size(this.bars) >= this.barsToPrime) this.ready = true;

        this.activeBar = aggBar

        if(aggBar.inProgress) return
        this.bars.push(aggBar);
        if(!this.bulkUpdates) upsert('bars', aggBar, { id: aggBar.id })
        if (this.bars.length > this.bulkSaveLimit + this.bulkMinToKeep) {
            await this.saveBars(this.bars);
            this.bars = this.bars.slice(this.bulkSaveLimit);
        }
        // utils.logDetails(`new bar`, bar, this.executionId, bar.symbol);
        return aggBar
    }

    barsAgo(i: number): AggregatedBar {
        return takeRight(this.bars, i)[0]
    }

    _trimBars() {
        if (size(this.bars) >= this.barsToPrime) {
            this.bars = takeRight(this.bars, this.barsToPrime);
        }
    }

    _updateIndicators(bar: AggregatedBar) {
        const indicators:any = {};
        forOwn(this.indicatorSettings, (i, name) => {
            if ('values' in i) {
                let value = this.getProperty(bar, i.values.barData)
                // console.log(`processing indicator ${name}`, value, i)
                indicators[name] = this._indicators[name].nextValue(Number(value));
            } else {
                const nextValue: any = {};
                forOwn(i, (v, k) => {
                    if (typeof (v) === 'object' && 'barData' in v) {
                        let value = this.getProperty(bar, v.barData)
                        nextValue[k] = Number(value);
                    }
                });
                // console.log(`processing indicator ${name}`, nextValue, i)
                indicators[name] = this._indicators[name].nextValue(nextValue);
            }
        });

        return indicators;
    }

    getLastBars(num: number): Array<AggregatedBar> {
        return takeRight(this.bars, num);
    }

    getDefaultIndicatorSettings() {
        return {
            'sma9': {
                type: 'SMA',
                period: 9,
                values: { barData: 'close' }
            },
            'sma20': {
                type: 'SMA',
                period: 20,
                values: { barData: 'close' }
            },
            'ema9': {
                type: 'EMA',
                period: 9,
                values: { barData: 'close' }
            },
            'ema20': {
                type: 'EMA',
                period: 20,
                values: { barData: 'close' }
            },
            'atr': {
                type: 'ATR',
                period: 14,
                high: { barData: 'high' },
                low: { barData: 'low' },
                close: { barData: 'close' }
            },
            'macd': {
                type: 'MACD',
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false,
                values: { barData: 'close' }
            },
            'vwap': {
                type: 'VWAP',
                open: { barData: 'open' },
                high: { barData: 'high' },
                low: { barData: 'low' },
                close: { barData: 'close' },
                volume: { barData: 'volume' }
            },
            'rsi': {
                type: 'RSI',
                period: 14,
                values: { barData: 'close' }
            },
            'avgVolume': {
                type: 'SMA',
                period: 20,
                values: { barData: 'volume' }
            }

        };
    }

    async saveBars(bars: Array<AggregatedBar>) {
        if (bars.length === 0) return;
        if (this.bulkUpdates) {
            bars.forEach(bar => {
                upsert('bars', bar, { id: bar.id })
            })            
        }
        return 
    }

    async finalize() {
        return this.saveBars(this.bars)
    }

    // pull property dynamically from a javascript (non-typescript) object
    getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
        return o[propertyName]
    }
}