import shortid from "shortid";
import { Order, OrderSide } from "./order-manager";
import { findOne, insertOne, upsert } from '../../mongo/mongo-utils'

export type PositionStatus = 'ACTIVE' | 'CLOSED'
export interface Position {
    id: string,
    botId: string,
    status: PositionStatus,
    symbol: string,
    originalSide: OrderSide,
    currentShares: number,  // negative is short, positive is long
    currentCapital: number,
    totalCapital: number,
    maxExposure: number,
    orders: Order[]
}

export class PositionManager {
    activePositions: Position[] = []
    closedPositions: Position[] = []
    unclaimedOrders: Order[] = []

    constructor() { }

    updateWithOrder(order: Order): Position | undefined {
        // find position in active positions
        let position = this.activePositions.find(p => p.symbol === order.symbol && p.botId === order.botId)

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
        const sharesOnOrder = Number(order.shares) - Number(order.totalFillShares)
        return {
            id: shortid(),
            botId: order.botId,
            status: 'ACTIVE',
            symbol: order.symbol,
            originalSide: order.side,
            currentShares: Number(order.totalFillShares),
            currentCapital: Number(order.totalFillAmount),
            totalCapital: Number(order.totalFillAmount),
            maxExposure: Number(order.totalFillAmount),
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
        if (position.currentShares === 0 && !position.orders.find(o => o.isActive)) {
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
            // TODO: update current shares, sharesOnOrder, etc... by recalculating from the orders
        } else {
            // adjust sharesOnOrder to remove any unfilled shares (error, cancel, etc...)
        }
        this.savePosition(position)
        return position
    }

    async savePosition(position: Position) {
        console.log('SAVING POSITION')
        return upsert('positions', position, {id: position.id})
    }

    async restorePositions(filter: any = {}) {
        // TODO: grab all positions from mongo
    }
}