import { BotDetails, SymbolDetails } from '../../common/definitions/strategy'
import { Order, OrderExecution  } from '../../connectors/positions/order-manager'
import { Bar, OrderBook } from '../../common/definitions/market-data'
import { StrategyBase } from '../base/stategy-base'
import { AggregatedBar } from '../aggregators/bar-aggregator'

export class TrendFollower extends StrategyBase {
    currentBar?: AggregatedBar
    previousBar?: AggregatedBar
    
    constructor(options: BotDetails, symbolDetails: SymbolDetails) {
        super(options, symbolDetails)
    }

    
    async onOrderFinished(order: Order) {
        // console.log('order finished', order)
    }

    async onOrderUpdate(order: Order) {
       // console.log(order)
       // TODO: when order has been filled, place order on opposite side at next level
    }

    async onNextBar(bar: AggregatedBar) {
        console.log(`BAR`, bar)
        // TODO: check existing orders vs expected grid orders
        this.currentBar = this.bars[bar.timeframe].barsAgo(1)
        this.previousBar = this.bars[bar.timeframe].barsAgo(2)

        if(this.position && this.position?.currentShares > 0) {
            return this.evaluateExit()
        } else {
            console.log(`**** NO POSITION FOR EXIT ****`, this.position)
        }

        if(this.activeOrders.length + this.pendingOrders.length > 0) {
            console.log('no entry, orders exist')
            return
        }
        
        return this.attemptNewPosition()
    }
    
    async onOrderBookUpdate(book: OrderBook): Promise<void> {
        console.log('new order book', book)
        return
    }

    async attemptNewPosition() {
        if(!this.currentBar || this.currentBar.inProgress || !this.previousBar) {
            console.log(`bars not ready, current=${this.currentBar}, previous=${this.previousBar}`)
            return
        }

        if(this.currentBar.close < this.currentBar.open) {
            console.log('no long entry, current bar is not green')
            return
        }
        if(this.previousBar.close > this.previousBar.open) {
            console.log('no long entry, previous bar is not red')
            return
        }
        // if(this.currentBar.volume || 0 < this.currentBar.indicators.avgVolume * 1.25) {
        //     console.log('no long entry, volume too low')
        //     return
        // }
        
        return this.placeOrder({
            symbol: this.symbol.symbol, side: 'BUY', type: 'MARKET', isExit: false, requestedAmount: 100
        })
    }

    async evaluateExit() {
        if(!this.currentBar || this.currentBar.inProgress || !this.previousBar) {
            console.log(`BARS NOT READY ON EXIT?, current=${this.currentBar}, previous=${this.previousBar}`)
            return
        }
        console.log('EVALUATING EXIT')
        if(this.position?.orders.find(o => o.isActive)) {
            console.log('NOT ATTEMPTING EXIT, position has active order(s)')
            return
        }
        if(this.position?.originalSide === 'BUY' && this.currentBar.close < this.currentBar.open) {
            console.log('EXITING LONG POSITION, bar is red')
            return this.placeOrder({
                symbol: this.symbol.symbol, side: 'SELL', type: 'MARKET', isExit: true, requestedShares: this.position?.currentShares
            })
        }
        
        return
        // signs of strength (long position, hold, or add position)
        //   * higher high, higher low, higher close
        //   * small tails (especially on bottom tail)
        // signs of weakness (hold, or partial exit)
        //   * red bar
        //   * long tails
        // signs of danger (consider exiting position)
        //   * red bar with larger volume
    }
}

module.exports = TrendFollower