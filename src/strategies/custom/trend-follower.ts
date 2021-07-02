import { BotDetails, SymbolDetails } from '../../common/definitions/strategy'
import { Order, OrderExecution  } from '../../connectors/positions/order-manager'
import { Bar, OrderBook } from '../../common/definitions/market-data'
import { StrategyBase } from '../base/stategy-base'

export class TrendFollower extends StrategyBase {
    lastBar?: Bar
    currentBar?: Bar
    
    constructor(options: BotDetails, symbolDetails: SymbolDetails) {
        super(options, symbolDetails)
    }

    async onOrderUpdate(order: Order) {
        console.log(order)
       // TODO: when order has been filled, place order on opposite side at next level
    }

    async onOrderExecution(orderExecution: OrderExecution) {
        console.log(orderExecution)
        return
    }

    async onNextBar(bar: Bar) {
        // TODO: check existing orders vs expected grid orders
        console.log(bar)
        if(!this.currentBar) {
            this.currentBar = bar
            return
        }
        this.lastBar = this.currentBar
        this.currentBar = bar

        if(this.position && this.position?.currentShares > 0) {
            return this.evaluateExistingPosition()
        }
        if(this.brokerProvider.activeOrders.length + this.brokerProvider.pendingOrderRequests.length > 0) return

        this.attemptNewPosition()

        return this.placeOrder({
            symbol: this.symbol.symbol, side: 'BUY', type: 'MARKET', isExit: false, requestedAmount: 100
        })
    }

    async onOrderBookUpdate(book: OrderBook): Promise<void> {
        // console.log('new order book', book)
        return
    }

    attemptNewPosition() {
        // lastBar is red, this currentBar is green
        // lastBar.volume is < currentBar.volume
    }

    evaluateExistingPosition() {
        // higher high and higher low (or vice versa)?  yes? highly aggressive
        // else set stop limit at last low for 1/2 original position
    }
}

module.exports = TrendFollower