import { BotDetails, SymbolDetails } from '../../common/definitions/strategy'
import { AccountInfo  } from '../../common/definitions/broker'
import { OrderBook } from '../../common/definitions/market-data'
import { StrategyBase } from '../base/stategy-base'

export class DollarCostAverage extends StrategyBase {
    constructor(options: BotDetails, symbolDetails: SymbolDetails) {
        super(options, symbolDetails)
    }
}

module.exports = DollarCostAverage