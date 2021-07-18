const _ = require('lodash');
const ti = require('technicalindicators');
const shortid = require('shortid')
const upsert = require('../../mongo/mongo-utils').upsert

class BarDetails {
    constructor(options) {
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
        _.forOwn(this.indicatorSettings, (i, name) => {
            const options = {};
            _.forOwn(i, (v, k) => {
                if (k !== 'type') {
                    if (typeof (v) === 'object' && 'barData' in v) {
                        options[k] = [];
                    } else {
                        options[k] = v;
                    }
                }
            });

            // utils.logDetails('setting indicator', { name, type: i.type, options});
            this._indicators[name] = new ti[i.type](options);
        });
    }

    previousBar() {
        this.barsAgo(1)
    }

    currentBar() {
        this.barsAgo(0)
    }

    async updateBars(bar) {
        const aggBar ={ ...bar }
        aggBar.mode = this.mode;
        aggBar.id = shortid.generate();
        aggBar.processTime = new Date();
        aggBar.botId = this.botId;
        aggBar.indicators = this._updateIndicators(aggBar);
        this.bars.push(aggBar);

        if (!this.ready && size(this.bars) >= this.barsToPrime) this.ready = true;

        if(!bar.inProgress)
        if(!this.bulkUpdates) return upsert('bars', aggBar, { id: aggBar.id })
        if (this.bars.length > this.bulkSaveLimit + this.bulkMinToKeep) {
            await this.saveBars(this.bars);
            this.bars = this.bars.slice(this.bulkSaveLimit);
        }
        // utils.logDetails(`new bar`, bar, this.executionId, bar.symbol);
        return;
    }

    barsAgo(i) {
        return _/takeRight(this.bars, i)[0]
    }

    _trimBars() {
        if (_.size(this.bars) >= this.barsToPrime) {
            this.bars = _.takeRight(this.bars, this.barsToPrime);
        }
    }

    _updateIndicators(bar) {
        const indicators = {};
        _.forOwn(this.indicatorSettings, (i, name) => {
            if ('values' in i) {
                indicators[name] = this._indicators[name].nextValue(Number(bar[i.values.barData]));
            } else {
                const nextValue = {};
                _.forOwn(i, (v, k) => {
                    if (typeof (v) === 'object' && 'barData' in v) {
                        nextValue[k] = Number(bar[v.barData]);
                    }
                });
                indicators[name] = this._indicators[name].nextValue(nextValue);
            }
        });

        return indicators;
    }

    getLastBars(num) {
        return _.takeRight(this.bars, num);
    }

    getDefaultIndicatorSettings() {
        return {
            'sma9': {
                type: 'SMA',
                period: 9,
                values: { barData: 'closePrice' }
            },
            'sma20': {
                type: 'SMA',
                period: 20,
                values: { barData: 'closePrice' }
            },
            'ema9': {
                type: 'EMA',
                period: 9,
                values: { barData: 'closePrice' }
            },
            'ema20': {
                type: 'EMA',
                period: 20,
                values: { barData: 'closePrice' }
            },
            'atr': {
                type: 'ATR',
                period: 14,
                high: { barData: 'highPrice' },
                low: { barData: 'lowPrice' },
                close: { barData: 'closePrice' }
            },
            'macd': {
                type: 'MACD',
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9,
                SimpleMAOscillator: false,
                SimpleMASignal: false,
                values: { barData: 'closePrice' }
            },
            'vwap': {
                type: 'VWAP',
                open: { barData: 'openPrice' },
                high: { barData: 'highPrice' },
                low: { barData: 'lowPrice' },
                close: { barData: 'closePrice' },
                volume: { barData: 'volume' }
            },
            'rsi': {
                type: 'RSI',
                period: 14,
                values: { barData: 'closePrice' }
            },
            'avgVolume': {
                type: 'SMA',
                period: 20,
                values: { barData: 'volume' }
            }

        };
    }

    async saveBars(bars) {
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
}

module.exports = BarDetails