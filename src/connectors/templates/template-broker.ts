import { Currency } from '../../common/definitions/basic'
import { OrderSubscriptionOptions } from '../../common/definitions/connectors'
import { BrokerProviderBase } from '../base/broker-base'
import { AccountInfo, OrderRequest } from '../positions/order-manager'

export class TemplateBroker extends BrokerProviderBase {
    getCurrentAccountInfo(currency: Currency): Promise<AccountInfo | undefined> {
        throw new Error('Method not implemented.')
    }
    addProviderOrderSubscriptions(options: OrderSubscriptionOptions) {
        throw new Error('Method not implemented.')
    }
    addProviderAccountSubscriptions() {
        throw new Error('Method not implemented.')
    }
    addProviderBalanceSubscriptions() {
        throw new Error('Method not implemented.')
    }
    buildBrokerOrderFromRequest(orderRequest: OrderRequest) {
        throw new Error('Method not implemented.')
    }
    placeBrokerOrder(brokerOrder: any): void {
        throw new Error('Method not implemented.')
    }
    getLastBrokerTrade(symbol: string): Promise<Number | undefined> {
        throw new Error('Method not implemented.')
    }

}

module.exports = TemplateBroker