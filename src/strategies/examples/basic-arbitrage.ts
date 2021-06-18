import { Execution, SymbolDetails } from '../base/models/strategy-options'
import { OrderBook } from '../../collectors/base/models/order-book'
import { StrategyBase } from '../base/stategy-base'

export class BasicArbitrage extends StrategyBase {
    bookXref: any = {}
    noFeeTotal: number = 0
    total: number = 0
    tradeCount: number = 0

    constructor(options: Execution, symbolDetails: SymbolDetails) {
        super(options, symbolDetails)
    }

    async onOrderBookUpdate(book: OrderBook) {
        this.bookXref[`${book.symbol}::${book.providerId}`] = book
        return this.evaluateEntry()
    }

    evaluateEntry() {
        for( const [bkey, bvalue] of Object.entries(this.bookXref)) {
            for( const [skey, svalue] of Object.entries(this.bookXref)) {
                if (bkey !== skey) {
                    const buy = <OrderBook> bvalue
                    const sell = <OrderBook> svalue

                    if (sell.bids[0].price > buy.asks[0].price) {
                        this.trackArb(buy, sell)
                    }
                }
            }
        }
    }

    trackArb(buyBook: OrderBook, sellBook: OrderBook) {
        const eventTime = new Date(Math.max(new Date(buyBook.eventTime || 0).getTime(), new Date(sellBook.eventTime || 0).getTime()))
        const shares = Math.min(sellBook.bids[0].quantity, buyBook.asks[0].quantity)
        const opportunity = (sellBook.bids[0].price - buyBook.asks[0].price) * shares
        const fees = (sellBook.bids[0].price + buyBook.asks[0].price) * shares * 0.001

        if (!opportunity) {
            console.log(`invalid opportunity ${opportunity}`)
            console.log(buyBook)
            console.log(sellBook)
            return
        }

        this.noFeeTotal += opportunity
        if (opportunity - fees < 0) {
            console.log(`unprofitable opportunity at ${eventTime}`)
            console.log(
                {
                    buySymbol: buyBook.symbol, sellSymbol: sellBook.symbol, opportunity, fees, shares, buyPrice: buyBook.asks[0].price,
                    sellPrice: sellBook.bids[0].price, diff: sellBook.bids[0].price - buyBook.asks[0].price, noFeeTotal: this.noFeeTotal,
                    total:this.total, tradeCount: this.tradeCount
                }
            )
            return
        }

        this.tradeCount += 1
        this.total += opportunity - fees
        console.log(`******* ${eventTime}`)
        console.log(` BUY  ${buyBook.symbol} @ ${buyBook.asks[0].price} (${buyBook.asks[0].quantity}) `)
        console.log(` SELL ${sellBook.symbol} @ ${sellBook.bids[0].price} (${sellBook.bids[0].quantity}) `)
        console.log(` OPPORTUNITY ${opportunity}`)
        console.log(` FEES  ${fees}`)
        console.log(` TOTAL ${opportunity - fees}`)
        console.log(` GRAND TOTAL ${this.total}`)
        console.log(`*******`)
    }
}

module.exports = BasicArbitrage