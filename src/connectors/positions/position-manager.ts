import shortid from "shortid";
import { Order } from "./order-manager";

export type PositionStatus = 'ACTIVE' | 'CLOSED'
export interface Position {
    id: string,
    botId: string,
    status: PositionStatus,
    symbol: string,
    currentShares: number,  // negative is short, positive is long
    sharesOnOrder: number,
    orders: Order[]
}

export class PositionManager {
    activePositions: Position[] = []
    closedPositions: Position[] = []
    unclaimedOrders: Order[] = []

    constructor() { }

    updateWithOrder(order: Order): Position | undefined {
        // find position in active positions
        let position = this.activePositions.find(p => p.orders.map(o=> o.id).includes(order.id))

        switch (order.status) {
            case 'OPEN':
            case 'REJECTED':
                return position
            case 'PARTIALLY_FILLED':
            case 'FILLED':
                position = this.processFilledOrder(order, position)
            default:
                if(position) {
                    position = this.processClosedOrder(order, position)
                } else {
                    this.unclaimedOrders = this.unclaimedOrders.filter(o => o.id !== order.id)
                    this.unclaimedOrders.push(order)
                }
        }

        return position
    }

    createNewPositionFromOrder(order: Order): Position {
        return {
            id: shortid(),
            botId: order.botId,
            status: 'ACTIVE',
            symbol: order.symbol,
            currentShares: Number(order.totalFillShares),
            sharesOnOrder: Number(order.shares) - Number(order.totalFillShares),
            orders: [order]
        }
    }

    processFilledOrder(order: Order, position: Position | undefined): Position | undefined {
        if (!['FILLED', 'PARTIALLY_FILLED'].includes(order.status)) return position
        if (!position) {
            position = this.createNewPositionFromOrder(order)
        } else {
            // remove position from active positions
            this.activePositions = this.activePositions.filter(p => p.id !== position?.id)
            position = this.updateExistingPosition(position, order)
        }
        this.activePositions.push(position)
        return position
    }

    processClosedOrder(order: Order, position: Position): Position {
        position = this.updateExistingPosition(position, order)
        if (position.currentShares === 0 && position.sharesOnOrder === 0) {
            position.status === 'CLOSED'
            this.closedPositions.push(position)
        } else {
            this.activePositions.push(position)
        }
        return position
    }

    updateExistingPosition(position: Position, order: Order): Position {
        // get the existing order from position orders and replace it with the new order
        const pOrder = position.orders.find(o => o.id === order.id)
        position.orders = position.orders.filter(o => o.id !== order.id)
        position.orders.push(order)

        if(order.isActive) {
            // TODO: update current shares, sharesOnOrder, etc...
        } else {
            // adjust sharesOnOrder to remove any unfilled shares (error, cancel, etc...)
        }

        return position
    }
}