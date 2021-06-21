import { BotDetails, SymbolDetails } from '../../common/definitions/strategy'
import { Order  } from '../../common/definitions/broker'
import { Bar } from '../../common/definitions/market-data'
import { StrategyBase } from '../base/stategy-base'

export class BasicGrid extends StrategyBase {
    desiredLevels: number = 2
    minGapPct: number = 0.5

    constructor(options: BotDetails, symbolDetails: SymbolDetails) {
        super(options, symbolDetails)
    }

    async onOrderUpdate(order: Order) {
       // TODO: when order has been filled, place order on opposite side at next level
    }

    async onNextBar(bar: Bar) {
        // TODO: check existing orders vs expected grid orders
        if(this.position && this.position?.currentShares > 0) return
        if(this.activeOrders.length > 0) return
        return this.placeOrder({
            symbol: this.symbol.symbol, side: 'BUY', type: 'MARKET', isExit: false
        })
    }
}

module.exports = BasicGrid