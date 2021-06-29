import { Argv } from 'yargs'
import { ProviderOptions } from '../common/definitions/connectors'
import config from '../../config'
const BinanceMarketData = require('../connectors/providers/binance/binance-market-data')
const BinanceBroker = require('../connectors/providers/binance/binance-broker')

export function wsServer(yargs: Argv) {
    const options = yargs
        .options('providerId', {
            describe: 'providerId',
            alias: 'i',
            default: 'binance',
            type: 'string'
        })
        .options('connectionType', {
            describe: 'Connection Type',
            alias: 't',
            default: 'MarketData',
            type: 'string'
        })
        .argv

    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)
    const binance = options.connectionType === 'MarketData' ? new BinanceMarketData(providerOptions, 'LIVE') : new BinanceBroker(providerOptions, 'LIVE')
    binance.startSocketServer()

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        binance.stopSocketServer()
        process.exit();
    });
}

export function wsClient(yargs: Argv) {
    const options = yargs.option('symbols', {
        describe: 'Symbol List (comma separated)',
        alias: 's',
        default: 'ADAUSDT,DOGEUSDT',
        type: 'string'
    })
        .option('providerId', {
            describe: 'providerId',
            alias: 'i',
            default: 'binance',
            type: 'string'
        })
        .option('topics', {
            describe: 'topics',
            alias: 't',
            default: 'book',
            type: 'string'
        }).argv

    const symbols = options.symbols.split(',')
    const topics = options.topics.split(',')
    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)
    const binanceData = new BinanceMarketData(providerOptions, 'LIVE')
    const binanceBroker = new BinanceBroker(providerOptions, 'LIVE')

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        binanceData.stopSocketListener()
        binanceBroker.stopSocketListener()
        process.exit();
    });

    binanceData.startSocketListener([
        { type: 'BAR', options: { symbols, timeframe: '15m', showActive: true }},
        { type: 'BOOK', options: { symbols }}
    ])
    binanceBroker.startSocketListener([{ type: 'ORDER', options: {}}])

    if (topics.includes('book')) {
        symbols.forEach(s => {
            binanceData.on(`${s}.book`, (e: any) => console.log(e))
        })
        binanceData.getLiveOrderBook({ symbols })
    }
    if (topics.includes('bar')) {
        symbols.forEach(s => {
            binanceData.on(`${s}.bar`, (e: any) => console.log(e))
        })
        binanceData.getLiveBarData({ symbols, timeframe: '1m', showActive: false })
    }
    if (topics.includes('executions')) {
        symbols.forEach(s => {
            binanceBroker.on(`${s}.orderExecution`, (e: any) => console.log(e))
        })
        binanceBroker.getLiveOrderExecutionData({ symbols })
    }
    if (topics.includes('account')) {
        binanceBroker.on('accountInfo', (e: any) => console.log(e))
        binanceBroker.getLiveAccountData()
    }
    if (topics.includes('raw')) {
        binanceBroker.socketClient.onAny((event: any, ...args: any) => {
            console.log(event); console.log(args)
        })
    }
}
