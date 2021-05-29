#!/usr/bin/env ts-node

import { OrderBook } from './src/collectors/base/models/order-book';
import yargs, { Argv, option } from 'yargs'

import { BinanceMarketData } from './src/collectors/providers/binance/binance-market-data'

const argv = yargs
    .command('demo', 'Run the live streaming bar demo', (yargs: Argv) => {
        const options = yargs.option("type", {
            describe: "Demo Type",
            alias: "t",
            default: "live-bar"
        })
        return demo(options.argv.type)
    })
    .command('wsServer', 'Start a WebSocket Server', (yargs: Argv) => {
        return wsServer()
    })
    .command('wsListener', 'Start WebSocket Listener', (yars: Argv) => {
        return wsClient()
    })
    .argv;

function wsServer() {
    const binance = new BinanceMarketData({ id: 'binance_live', providerType: 'MarketData', name: 'binance' }, 'LIVE')
    binance.startSocketServer()

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        binance.stopSocketServer()
        process.exit();
    });

    binance.getLiveOrderBook({symbols: ['ADAUSDT', 'BTCUSDT' ]})
}

async function wsClient() {
    const binance = new BinanceMarketData({ id: 'binance_live', providerType: 'MarketData', name: 'binance' }, 'LIVE')
    binance.on('ADAUSDT.book', (e: any) => console.log(e))

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");
        binance.stopSocketListener()
        process.exit();
    });

    binance.startSocketListener()
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
        case 'basic-arb':
            basicArbitrageDemo()
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

    console.log(options)

    const binance = new BinanceMarketData({ id: 'binance_live', providerType: 'MarketData', name: 'binance' }, 'LIVE')
    
    const symbols = options.argv.symbols.split(',')
    symbols.forEach(s => {
        binance.on(`${s}.bar`, (book) => console.log(book))
    })

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");

        binance.stopMarketDataStream()
        process.exit();
    });

    binance.getLiveBarData({ symbols: options.argv.symbols.split(','), timeframe: '1m', showActive: options.argv.inProgress })

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
    const binance = new BinanceMarketData({ id: 'binance_live', providerType: 'MarketData', name: 'binance' }, 'LIVE')

    const symbols = options.argv.symbols.split(',')
    symbols.forEach(s => {
        binance.on(`${s}.bar`, (book) => console.log(book))
    })

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");

        binance.stopMarketDataStream()
        process.exit();
    });

    binance.getHistoricalBarData({ symbols: options.argv.symbols.split(','), timeframe: options.argv.timeframe, limit: options.argv.limit, afterDate: new Date(options.argv.afterDate) })
}

function liveOrderBookDemo() {
    const options = yargs.option("symbols", {
        describe: "Symbol List (comma separated)",
        alias: "s",
        default: "ADAUSDT,DOGEUSDT",
        type: "string"
    })

    const symbols = options.argv.symbols.split(',')
    const binance = new BinanceMarketData({ id: 'binance_live', providerType: 'MarketData', name: 'binance' }, 'LIVE')

    symbols.forEach(s => {
        binance.on(`${s}.book`, (book) => console.log(book))
    })

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");

        binance.stopMarketDataStream()
        process.exit();
    });

    binance.getLiveOrderBook({ symbols })
}

function basicArbitrageDemo() {
    const options = yargs.option("symbols", {
        describe: "Symbol List (comma separated)",
        alias: "s",
        default: "ADAUSDT,DOGEUSDT",
        type: "string"
    })
        .option("verbose", {
            describe: "Show Orderbook on Opportunity",
            alias: "v",
            default: false,
            type: "boolean"
        })
    const latestBook: Map<string, OrderBook> = new Map()
    const binance = new BinanceMarketData({ id: 'binance_live', providerType: 'MarketData', name: 'binance' }, 'LIVE')
    let total = 0.0
    let tradeCount = 0
    let noFeeTotal = 0

    const symbols = options.argv.symbols.split(',')
    
    symbols.forEach(s => {
        binance.on(`${s}.book`, (book) => {
            bookListener(book)
        })
    })

    function bookListener(book: OrderBook) {
        latestBook.set(book.symbol, book)
        latestBook.forEach(b => {
            if (b.symbol === book.symbol) return

            if (b.bids[0].price > book.asks[0].price) {
                trackArb(book, b, b.eventTime)
            }

            if (book.bids[0].price > b.asks[0].price) {
                trackArb(b, book, b.eventTime)
            }
        })
    }

    process.on('SIGINT', function () {
        console.log("Caught interrupt signal, closing socket");

        binance.stopMarketDataStream()
        process.exit();
    });



    binance.getLiveOrderBook({ symbols })

    function trackArb(buyBook: OrderBook, sellBook: OrderBook, eventTime: Date) {
        const shares = Math.min(sellBook.bids[0].quantity, buyBook.asks[0].quantity)
        const opportunity = (sellBook.bids[0].price - buyBook.asks[0].price) * shares
        const fees = (sellBook.bids[0].price + buyBook.asks[0].price) * shares * 0.001

        if (!opportunity) {
            console.log(`invalid opportunity ${opportunity}`)
            console.log(buyBook)
            console.log(sellBook)
            return
        }

        noFeeTotal += opportunity
        if (opportunity - fees < 0) {
            console.log(`unprofitable opportunity at ${eventTime}`)
            console.log(
                { 
                    buySymbol: buyBook.symbol, sellSymbol: sellBook.symbol, opportunity, fees, shares, buyPrice: buyBook.asks[0].price,
                    sellPrice: sellBook.bids[0].price, diff: sellBook.bids[0].price - buyBook.asks[0].price, noFeeTotal, total, tradeCount
                }
            )
            return
        }

        tradeCount += 1
        total += opportunity - fees
        console.log(`******* ${eventTime}`)
        console.log(` BUY  ${buyBook.symbol} @ ${buyBook.asks[0].price} (${buyBook.asks[0].quantity}) `)
        console.log(` SELL ${sellBook.symbol} @ ${sellBook.bids[0].price} (${sellBook.bids[0].quantity}) `)
        console.log(` OPPORTUNITY ${opportunity}`)
        console.log(` FEES  ${fees}`)
        console.log(` TOTAL ${opportunity - fees}`)
        console.log(` GRAND TOTAL ${total}`)
        console.log(`*******`)
        if (options.argv.verbose) {
            console.log(buyBook)
            console.log(sellBook)
        }
    }
}

