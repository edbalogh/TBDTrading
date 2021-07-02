import { BotDetails, SymbolDetails } from '../../common/definitions/strategy'
import { Bar, OrderBook } from '../../common/definitions/market-data'
import { StrategyBase } from '../base/stategy-base'
import { Order } from '../../connectors/positions/order-manager'

export class BasicGrid extends StrategyBase {
    desiredLevels: number = 2
    minGapPct: number = 0.5

    constructor(options: BotDetails, symbolDetails: SymbolDetails) {
        super(options, symbolDetails)
    }

    async onOrderUpdate(order: Order) {
        console.log('strategy order update', order)
       // TODO: when order has been filled, place order on opposite side at next level
    }

    async onNextBar(bar: Bar) {
        // TODO: check existing orders vs expected grid orders
        console.log(bar)
        if(this.position && this.position?.currentShares > 0) return
        if(this.brokerProvider.activeOrders.length + this.brokerProvider.pendingOrderRequests.length > 0) return
        return this.placeOrder({
            symbol: this.symbol.symbol, side: 'BUY', type: 'MARKET', isExit: false, requestedAmount: 100
        })
    }

    async onOrderBookUpdate(book: OrderBook): Promise<void> {
        // console.log('new order book', book)
        return
    }
}

module.exports = BasicGrid