import { BrokerProviderBase, OrderExecution, BrokerBalance, AccountInfo, BrokerPosition } from '../../base/broker-base'
import { OrderSubscriptionOptions } from '../../base/sockets/broker-socket'
import { Mode } from '../../../constants/types'
import { ProviderOptions } from '../../base/models/provider-options'
import { OutboundAccountInfo, ExecutionReport, OutboundAccountPosition, BalanceUpdate } from 'binance-api-node'

const Binance = require('binance-api-node').default

export abstract class BinanceProvider extends BrokerProviderBase {
    providerSocket: any
    constructor(options: ProviderOptions, mode: Mode) {
        const client = new Binance(options.apiOptions)  // TODO: pull the provider dynamically
        super(options, mode, client)
    }

    addProviderUserSubscriptions(): void {
        this.providerSocket = this.client.ws.user( (event: any) => {
            switch (event.eventType) {
                case 'executionReport':
                    const execution: OrderExecution = this.translateOrderExecution(event)
                    this.emitter(`${execution.symbol}.orderExecution`, execution)
                    break
                case 'account':
                    const accountInfo: AccountInfo = this.translateAccountInfo(event)
                    this.emitter('accountInfo', accountInfo)
                    break
                case 'balanceUpdate':
                    const balanceUpdate: BrokerBalance = this.translateBrokerBalance(event)
                    this.emitter('brokerBalance', balanceUpdate)
                    break
                case 'outboundAccountPosition':
                    const brokerPosition: BrokerPosition = this.translateBrokerPosition(event)
                    this.emitter('brokerPosition', brokerPosition)
                    break
                default:
                    console.log(`untracked websocket event`)
                    console.log(event)
            }
        });
    }

    translateOrderExecution(execution: ExecutionReport): OrderExecution {
        const orderExecution: Partial<OrderExecution> = {}
        return <OrderExecution>orderExecution
    }

    translateAccountInfo(account: OutboundAccountInfo): AccountInfo {
        const accountInfo: Partial<AccountInfo> = {}
        return <AccountInfo>accountInfo
    }

    translateBrokerBalance(balance: BalanceUpdate): BrokerBalance {
        const balanceDetails: Partial<BrokerBalance> = {}
        return <BrokerBalance>balanceDetails
    }

    translateBrokerPosition(balance: OutboundAccountPosition): BrokerPosition {
        const positionDetails: Partial<BrokerPosition> = {}
        return <BrokerPosition>positionDetails
    }

    addProviderOrderSubscriptions(options: OrderSubscriptionOptions): any {}
    addProviderAccountSubscriptions(): any {}
    addProviderBalanceSubscriptions(): any {}
}