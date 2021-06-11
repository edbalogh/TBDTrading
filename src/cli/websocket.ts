import yargs, { Argv } from 'yargs'
import { ProviderOptions } from '../collectors/base/models/provider-options'
import config from '../../config'
const BinanceMarketData = require('../collectors/providers/binance/binance-market-data')

export function wsServer(yargs: Argv) {
    const options = yargs
        .options('providerId', {
            describe: 'providerId',
            alias: 'i',
            default: 'binance',
            type: 'string'
        }).argv

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
        })
        .option('topic', {
            describe: 'topic',
            alias: 't',
            default: 'book',
            type: 'string'
        }).argv

    const symbols = options.symbols.split(',')
    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)
    const binance = new BinanceMarketData(providerOptions, 'LIVE')

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        binance.stopSocketListener()
        process.exit();
    });

    binance.startSocketListener()
    
    switch(options.topic.toLowerCase()) {
        case 'book':
            symbols.forEach(s => {
                binance.on(`${s}.book`, (e: any) => console.log(e))
            })
            binance.getLiveOrderBook({symbols})
            break
        case 'bar':
            symbols.forEach(s => {
                binance.on(`${s}.bar`, (e: any) => console.log(e))
            })
            binance.getLiveBarData({symbols, timeframe: '1h', showActive: true})
            break 
        case 'both':
            symbols.forEach(s => {
                binance.on(`${s}.bar`, (e: any) => console.log(e))
                binance.on(`${s}.book`, (e: any) => console.log(e))
            })
            binance.getLiveBarData({symbols, timeframe: '1h', showActive: true})
            binance.getLiveOrderBook({symbols})
            break
    }
   
}