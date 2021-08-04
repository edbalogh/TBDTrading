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
        console.log('order update', order)
       // TODO: when order has been filled, place order on opposite side at next level
    }

    async onOrderFinished(order: Order) {
        console.log('order finished', order)
    }

    async onNextBar(bar: Bar) {
        // TODO: check existing orders vs expected grid orders
        console.log(bar)
        if(this.position && this.position?.currentShares > 0) {
            this.evaluateExit()
            return
        }
        if(this.activeOrders.length + this.pendingOrders.length > 0) return
        return this.placeOrder({
            symbol: this.symbol.symbol, side: 'BUY', type: 'MARKET', isExit: false, requestedAmount: 100     // TODO: calculate order size
        })
    }

    async evaluateExit() {
        if(this.position?.orders.find(o => o.isActive)) return
        return this.placeOrder({
            symbol: this.symbol.symbol, side: 'SELL', type: 'MARKET', isExit: true, requestedShares: this.position?.currentShares
        })
    }

    async onOrderBookUpdate(book: OrderBook): Promise<void> {
        // console.log('new order book', book)
        return
    }
}

module.exports = BasicGrid