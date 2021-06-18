import { BrokerProviderBase } from '../../base/broker-base'
import { ExecutionType, OrderExecution, OrderStatus, OrderSide, OrderType, BrokerBalance, AccountInfo, Balance} from '../../../common/definitions/broker'
import { OrderSubscriptionOptions } from '../../../common/definitions/websocket'
import { Mode } from '../../../common/definitions/basic'
import { ProviderOptions } from '../../../common/definitions/options'
import { OutboundAccountInfo, ExecutionReport, OutboundAccountPosition, BalanceUpdate, Balances } from 'binance-api-node'
import { barEpochTimeToUTC } from '../../../utils/datetime-helpers'

const Binance = require('binance-api-node').default

export abstract class BinanceBroker extends BrokerProviderBase {
    providerSocket: any

    constructor(options: ProviderOptions, mode: Mode) {
        const client = new Binance(options.apiOptions)  // TODO: pull the provider dynamically
        super(options, mode, client)
    }

    addProviderOrderSubscriptions(options: OrderSubscriptionOptions): any {
        this.addProviderUserSubscriptions()
    }
    addProviderAccountSubscriptions(): any {
        this.addProviderUserSubscriptions()
    }
    addProviderBalanceSubscriptions(): any {
        this.addProviderUserSubscriptions()
    }

    addProviderUserSubscriptions(): void {
        if (this.providerSocket) return
        this.providerSocket = this.client.ws.user((event: any) => {
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
                    this.emitter('brokerBalance', event)
                    break
                case 'outboundAccountPosition':
                    // const brokerPosition: BrokerPosition = this.translateBrokerPosition(event)
                    this.emitter('brokerPosition', event)
                    break
                default:
                    console.log(`untracked websocket event`, event)
            }
        });
    }

    translateOrderExecution(execution: ExecutionReport): OrderExecution {
        return {
            symbol: execution.symbol,
            orderId: execution.originalClientOrderId || '',
            brokerOrderId: <string>(execution.orderId || execution.orderListId || ''),
            executionType: <ExecutionType>execution.executionType,
            executionTime: barEpochTimeToUTC(execution.orderTime),
            orderStatus: this.translateOrderStatus(execution.orderStatus),
            orderSide: <OrderSide>execution.side,
            orderType: <OrderType>execution.orderType,
            orderTime: barEpochTimeToUTC(execution.creationTime),
            tif: execution.timeInForce,
            rejectReason: execution.orderRejectReason,
            executionQuantity: Number(execution.quantity),
            totalQuantity: Number(execution.totalQuoteTradeQuantity),
            executionPrice: Number(execution.price),
            commission: Number(execution.commission),
            commissionAsset: execution.commissionAsset || '',
            tradeId: <string>(execution.tradeId || '')
        }
    }

    translateOrderStatus(status: string): OrderStatus {
        switch (status) {
            case 'EXPIRED':
                return 'CLOSED'
            case 'NEW' || 'PENDING_CANCEL':
                return 'OPEN'
            default:
                return status as OrderStatus
        }
    }

    translateAccountInfo(account: OutboundAccountInfo): AccountInfo {
        return {
            lastUpdateTime: barEpochTimeToUTC(account.lastAccountUpdate),
            balances: this._translateAccountBalances(account.balances)
        }
    }

    _translateAccountBalances(balances: Balances) {
        const b: Balance[] = []
        for (let key in balances) {
            const available = Number(balances[key].available)
            const inOrder = Number(balances[key].locked)
            const total = available + inOrder
            if (available > 0 || inOrder > 0) b.push({ asset: key, total, available, inOrder })
        }
        return b
    }

    translateBrokerBalance(balance: BalanceUpdate): BrokerBalance {
        const balanceDetails: Partial<BrokerBalance> = {}
        return <BrokerBalance>balanceDetails
    }
}

module.exports = BinanceBroker