import { Argv } from 'yargs'
import { MarketDataSubscriptionRequest, ProviderOptions } from '../common/definitions/connectors'
import { BinanceBrokerSocketServer } from '../connectors/providers/binance/binance-broker-socket'
import { KucoinBrokerSocketServer } from '../connectors/providers/kucoin/kucoin-broker-socket'
import config from '../../config'
import { isParameter } from 'typescript'
import { MarketDataProviderBase } from '../connectors/base/market-data-base'
import { BrokerProviderBase } from '../connectors/base/broker-base'
const KucoinMarketData = require('../connectors/providers/kucoin/kucoin-market-data')
const KucoinBroker = require('../connectors/providers/kucoin/kucoin-broker')
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
    let provider: any = {}

    if(options.providerId.startsWith('kucoin')) {
        if(options.connectionType === 'Broker') provider = new KucoinBrokerSocketServer(providerOptions, 'LIVE')
        if(options.connectionType === 'MarketData') provider = new KucoinMarketData(providerOptions, 'LIVE')
    } else {
        if(options.connectionType === 'Broker') provider = new BinanceBrokerSocketServer(providerOptions, 'LIVE')
        if(options.connectionType === 'MarketData') provider = new BinanceMarketData(providerOptions, 'LIVE')
    }
    
    provider.startSocketServer()

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        provider.stopSocketServer()
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
        })
        .option('timeframe', {
            describe: 'timeframe',
            alias: 'f',
            default: '15m',
            type: 'string'
        }).argv

    const symbols = options.symbols.split(',')
    const topics = options.topics.split(',')
    const providerOptions: ProviderOptions = <any>config.providers.find(p => p.id === options.providerId)

    console.log(`symbols=${symbols},topics=${topics},options=${JSON.stringify(providerOptions)}`)

    let providerData: MarketDataProviderBase = new BinanceMarketData(providerOptions, 'LIVE')
    let providerBroker: BrokerProviderBase = new BinanceBroker(providerOptions, 'LIVE')
    if(options.providerId.startsWith('kucoin')) {
        providerData = new KucoinMarketData(providerOptions, 'LIVE')
        providerBroker = new KucoinBroker(providerOptions, 'LIVE')
    }

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        providerData.stopSocketListener()
        providerBroker.stopSocketListener()
        process.exit();
    });

    const mdSubs: MarketDataSubscriptionRequest[] = [
        { type: 'BAR', options: { symbols, timeframe: options.timeframe, showActive: true }},
        { type: 'BOOK', options: { symbols }}
    ]
    
    providerData.startSocketListener(mdSubs)
    providerBroker.startSocketListener([{ type: 'ORDER', options: {symbols}}])

    if (topics.includes('book')) {
        symbols.forEach(s => {
            providerData.on(`${s}.book`, (e: any) => console.log(e))
        })
        providerData.addProviderBookSubscriptions({ symbols })
        async () => await delay(5000)
    }
    if (topics.includes('bar')) {
        symbols.forEach(s => {
            providerData.on(`${s}.bar`, (e: any) => console.log(e))
        })
        providerData.addProviderBarSubscriptions({ symbols, timeframe: options.timeframe, showActive: false })
    }
    if (topics.includes('order')) {
        symbols.forEach(s => {
            providerBroker.on(`${s}.orderUpdate`, (e: any) => console.log(e))
        })
        providerBroker.addProviderOrderSubscriptions({ symbols })
    }
    // if (topics.includes('account')) {
    //     providerBroker.on('accountInfo', (e: any) => console.log(e))
    //     providerBroker.getLiveAccountData()
    // }
    if (topics.includes('raw')) {
        providerBroker.providerClient.onAny((event: any, ...args: any) => {
            console.log(event); console.log(args)
        })
    }
}

const delay = async (ms: number) => new Promise(res => setTimeout(res, ms));
