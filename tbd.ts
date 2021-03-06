#!/usr/bin/env ts-node

import { OrderBook } from './src/common/definitions/broker';
import yargs, { Argv } from 'yargs'
import { ProviderOptions } from './src/common/definitions/options'
import config from './config'
const BinanceMarketData = require('./src/collectors/providers/binance/binance-market-data')
import { Execution } from './src/strategies/base/models/strategy-options';
import { wsServer, wsClient } from './src/cli/websocket'


yargs
    .command('demo', 'Run the live streaming bar demo', (yargs: Argv) => {
        const options = yargs.option('type', {
            describe: 'Demo Type',
            alias: 't',
            default: 'live-bar'
        })
        return demo(options.argv.type)
    })
    .command('wsServer', 'Start a WebSocket Server', (yargs: Argv) => {
        return wsServer(yargs)
    })
    .command('wsListener', 'Start WebSocket Listener', (yargs: Argv) => {
        return wsClient(yargs)
    })
    .command('execution', 'Start Execution', (yargs: Argv) => {
        return executeStrategy(yargs)
    })
    .argv;

function executeStrategy(yargs: Argv) {
    const BasicArbitrage = require('./src/strategies/examples/basic-arbitrage')
    const execution: Execution = {
        id: '1',
        name: 'canary',
        strategyId: 'basic-arb',
        mode: 'LIVE',
        baseCurrency: 'USD',
        symbols: [
            { symbol: 'ADAUSDT', status: 'PENDING', reference: false, providerId: 'binance' },
            { symbol: 'ADAUSD', status: 'PENDING', reference: true, providerId: 'binance' }
        ],
        status: 'PENDING',
        providers: [{ providerId: 'binance' }]
    }

    const bot = new BasicArbitrage(execution, execution.symbols[0])
    bot.startup()
    // try {
    //     bot.startup()
    // } catch {
    //     console.log('ending')
    // } finally {
    //     bot.shutdown()
    // }
    return
}



function demo(type: string) {
    switch (type) {
        case 'live-bar':
            liveBarDemo()
            break
        case 'historical-bar':
            historicalBarDemo()
            break;
        case 'live-book':
            liveOrderBookDemo()
            break;
        default:
            break
    }
}

function liveBarDemo() {
    const options = yargs.option("symbols", {
        describe: "Symbol List (comma separated)",
        alias: "s",
        default: "ADAUSDT,DOGEUSDT",
        type: "string"
    })
        .option("inProgress", {
            describe: "Show Bars that are Building",
            alias: "p",
            default: false,
            type: "boolean"
        })
        .option('providerId', {
            describe: 'providerId',
            alias: 'i',
            default: 'binance',
            type: 'string'
        }).argv

    const symbols = options.symbols.split(',')
    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)
    const binance = new BinanceMarketData(providerOptions, 'LIVE')
    symbols.forEach(s => {
        binance.on(`${s}.bar`, (book: OrderBook) => console.log(book))
    })

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");

        binance.stopMarketDataStream()
        process.exit();
    });

    binance.getLiveBarData({ symbols, timeframe: '1m', showActive: options.inProgress })

}

function historicalBarDemo() {
    const options = yargs.option("symbols", {
        describe: "Symbol List (comma separated)",
        alias: "s",
        default: "ADAUSDT,DOGEUSDT",
        type: "string"
    })
        .option("timeframe", {
            describe: "Timeframe/Interval for the Bar Data",
            alias: "i",
            type: "string",
            default: '1h'
        })
        .option("limit", {
            describe: "Max Number of Bars to Pull",
            alias: "l",
            type: "number",
            default: 10
        })
        .option("afterDate", {
            describe: "Date to Start Pulling Bar Data",
            alias: "a",
            type: "string",
            default: "2021-01-01"
        })
        .option('providerId', {
            describe: 'providerId',
            alias: 'i',
            default: 'binance',
            type: 'string'
        }).argv

    const symbols = options.symbols.split(',')
    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)
    const binance = new BinanceMarketData(providerOptions, 'LIVE')
    symbols.forEach(s => {
        binance.on(`${s}.bar`, (book: OrderBook) => console.log(book))
    })

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");

        binance.stopMarketDataStream()
        process.exit();
    });

    binance.getHistoricalBarData({ symbols, timeframe: options.timeframe, limit: options.limit, afterDate: new Date(options.afterDate) })
}

function liveOrderBookDemo() {
    const options = yargs.option("symbols", {
        describe: "Symbol List (comma separated)",
        alias: "s",
        default: "ADAUSDT,DOGEUSDT",
        type: "string"
    })
        .options('providerId', {
            describe: 'providerId',
            alias: 'i',
            default: 'binance',
            type: 'string'
        }).argv

    const symbols = options.symbols.split(',')
    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)
    const binance = new BinanceMarketData(providerOptions, 'LIVE')

    symbols.forEach(s => {
        binance.on(`${s}.book`, (book: OrderBook) => console.log(book))
    })

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");

        binance.stopMarketDataStream()
        process.exit();
    });

    binance.getLiveOrderBook({ symbols })
}

