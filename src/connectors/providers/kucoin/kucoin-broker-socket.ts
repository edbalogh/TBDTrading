import { Mode } from '../../../common/definitions/basic';
import { OrderSubscriptionOptions, ProviderOptions } from '../../../common/definitions/connectors';
import { BrokerSocketServerBase } from '../../base/sockets/broker-socket-base'
const KucoinBroker = require('./kucoin-broker')

export class KucoinBrokerSocketServer extends BrokerSocketServerBase {
    brokerProvider: any
    constructor(options: ProviderOptions, mode: Mode) {
        const brokerProvider = new KucoinBroker(options, mode)
        super(options, mode, brokerProvider)
    }

    addProviderOrderSubscriptions(options: OrderSubscriptionOptions) {
        return this.brokerProvider.addProviderOrderSubscriptions(options)
    }
    addProviderAccountSubscriptions() {
        return this.brokerProvider.addProviderAccountSubscriptions()
    }
    addProviderBalanceSubscriptions() {
        return this.brokerProvider.addProviderBalanceSubscriptions()
    }
}

