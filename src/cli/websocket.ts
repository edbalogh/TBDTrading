import yargs, { Argv } from 'yargs'
import { ProviderOptions } from '../collectors/base/models/provider-options'
import config from '../../config'
const BinanceMarketData = require('../collectors/providers/binance/binance-market-data')

export function wsServer(yargs: Argv) {
    const options = yargs.option('symbols', {
        describe: 'Symbol List (comma separated)',
        alias: 's',
        default: 'ADAUSDT,DOGEUSDT',
        type: 'string'
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
        }).argv

    const symbols = options.symbols.split(',')
    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)
    const binance = new BinanceMarketData(providerOptions, 'LIVE')

    symbols.forEach(s => {
        binance.on(`${s}.book`, (e: any) => console.log(e))
    })

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        binance.stopSocketListener()
        process.exit();
    });

    binance.startSocketListener()
    binance.getLiveOrderBook(providerOptions)
}