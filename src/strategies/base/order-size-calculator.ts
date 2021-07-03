
import { OrderSizeDetails, OrderSizeOptions } from '../../common/definitions/strategy'
import { OrderRequest } from '../../connectors/positions/order-manager'
import { floor, divide } from 'lodash'
import { findOne, insertOne, upsert } from '../../mongo/mongo-utils'
const utils = require('../../utils/legacy')

export class OrderSizeCalculator {
    botId: string
    options: OrderSizeOptions

    constructor(botId: string, options: OrderSizeOptions) {
        this.options = options
        this.botId = botId
    }

    // append order size details to the order options so the broker code can make decisions on how setup the broker order
    async calculateOrderSize(orderRequest: OrderRequest, lastPrice: number, availableCapital: number): Promise<OrderSizeDetails> {
        
        if (!lastPrice && !orderRequest.limitPrice) return { shares: 0, sharesLimitedBy: 'missing last price and limit price' };
        const maxShares:any = this.maxSharesForOrder(orderRequest);
        const maxCapital = await this.maxCapitalForOrder(orderRequest, availableCapital);

        // calculate the capital required to get the max shares
        if (maxShares.shares > 0) {
            const capitalRequiredForMaxShares = maxShares.shares * (orderRequest.limitPrice || lastPrice);
            if (capitalRequiredForMaxShares < maxCapital.amount) {
                maxCapital.amount = capitalRequiredForMaxShares;
                maxCapital.reason = 'max.shares';
            }
        }

        if (maxCapital.amount > 0) {
            const maxSharesForCapital = divide(maxCapital.amount, (orderRequest.limitPrice || lastPrice))
            if (maxShares.shares <= 0 || maxSharesForCapital < maxShares.shares) {
                maxShares.shares = maxSharesForCapital
                maxShares.reason = 'max.capital'
            }
        } else {
            utils.logDetails('max capital calculation error', { maxShares, maxCapital, orderRequest }, this.botId)
            return { shares: 0, sharesLimitedBy: 'max capital calculation error' }
        }

        // remove any decimals unless fractional shares are supported
        if (!this.options.supportsFractionalShares) maxShares.shares = floor(maxShares.shares);

        // update shares and amount (preserving original) and document limiting reason
        return {
            originalShares: orderRequest.requestedShares,
            shares: Number(maxShares.shares),
            sharesLimitedBy: <string>maxShares.reason,
            originalAmount: orderRequest.requestedAmount,
            amount: maxCapital.amount,
            amountLimitedBy: Number(maxShares.reason)
        }
    }

    // determine the max capital that can be allocated for the order (with the limiting factor logged)
    async maxCapitalForOrder(orderRequest: OrderRequest, accountBalance: number): Promise<any> {
        const sources = [];

        const currentSpend = this.getCurrentSpend(orderRequest.symbol);
        if (accountBalance) sources.push(['account.balance', accountBalance]);

        if (orderRequest.requestedAmount && orderRequest.requestedAmount > 0) sources.push(['order.requestedAmount', orderRequest.requestedAmount]);

        if (this.options.tradeSizeAmount && this.options.tradeSizeAmount > 0) {
            sources.push(['strategy.tradeSizeAmount', this.options.tradeSizeAmount]);
        }

        if (this.options.maxCapitalPerSymbol && this.options.maxCapitalPerSymbol > 0) {
            sources.push(['strategy.maxCapitalPerSymbol', this.options.maxCapitalPerSymbol - currentSpend.symbolInStrategy]);
        }

        if (this.options.maxCapitalPerSymbol && this.options.maxCapitalPerSymbol > 0) {
            sources.push(['broker.maxCapitalPerSymbol', this.options.maxCapitalPerSymbol - currentSpend.symbol]);
        }

        if (this.options.maxCapitalPerStrategy && this.options.maxCapitalPerStrategy > 0) {
            sources.push(['broker.maxCapitalPerStrategy', this.options.maxCapitalPerStrategy - currentSpend.strategy]);
        }

        // sort and return the lowest object
        const min = sources.sort((a:any, b:any) => a[1] - b[1])[0];
        return { amount: min[1], reason: min[0] }
    }

    // determine the max shares that can be allocated for the order (with the limiting factor logged)
    maxSharesForOrder(orderRequest: OrderRequest) {
        const sources = [];

        if (orderRequest.requestedShares && orderRequest.requestedShares > 0) sources.push(['order.requestedShares', orderRequest.requestedShares]);
        if (this.options.tradeSizeShares && this.options.tradeSizeShares > 0) {
            sources.push(['strategy.tradeSizeShares', this.options.tradeSizeShares]);
        }
        const min = sources.sort((a:any, b:any) => a[1] - b[1])[0];
        return min ? { shares: min[1], reason: min[0] } : { shares: -1, reason: 'no max shares specified' }
    }

    getCurrentSpend(symbol: string): any {
        const spend = {
            symbol: 0,
            strategy: 0,
            symbolInStrategy: 0,
            overall: 0
        }

        // TODO: replace this with a Mongo query to get all active positions for botId
        // const pos = this.activePositions.filter(x => this.positionIsActive(x)).map(x => {
        //     const out = {};
        //     out.symbol = x.symbol;
        //     out.executionId = x.executionId;
        //     out.capital = x.side === 'BUY' ? x.buyPrice * x.shares : x.sellPrice * x.shares;
        //     return out;
        // });

        // spend.overall = pos.reduce((a, b) => a + b, 0);
        // spend.strategy = pos.filter(x => x.executionId === this.botId).reduce((a, b) => a + b, 0);
        // spend.symbol = pos.filter(x => x.symbol === symbol).reduce((a, b) => a + b, 0);
        // spend.symbolInStrategy = pos.filter(x => x.executionId === executionId && x.symbol === symbol).reduce((a, b) => a + b, 0);

        return spend;
    }
}