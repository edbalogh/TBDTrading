import shortid from "shortid";
import { Order, OrderSide } from "./order-manager";
import { findOne, insertOne, upsert } from '../../mongo/mongo-utils'
import { sum, sumBy } from "lodash";
import { OrderSizeCalculator } from "../../strategies/base/order-size-calculator";
import { OrderRejectReason } from "binance-api-node";

export type PositionStatus = 'ACTIVE' | 'CLOSED'
export interface Position {
    id: string,
    botId: string,
    status: PositionStatus,
    symbol: string,
    originalSide: OrderSide,
    currentShares: number,  // negative is short, positive is long
    currentCapital: number,
    totalCommission: number,
    avgBuyPrice?: number,
    avgSellPrice?: number,
    totalCapital: number,
    totalSharesTraded: number,
    maxExposure: number,
    realizedPnl: number,
    sharesBought: number,
    sharesSold: number,
    pnl: number,
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
        if (!position) position = this.closedPositions.find(p => p.orders.find(o => o.id === order.id))

        switch (order.status) {
            case 'OPEN':
            case 'REJECTED':
                return position
            case 'PARTIALLY_FILLED':
            case 'FILLED':
                position = this.processFilledOrder(order, position)
            default:
                if (position) {
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
            totalCommission: 0,
            totalCapital: Number(order.totalFillAmount),
            totalSharesTraded: Number(order.totalFillShares),
            maxExposure: Number(order.totalFillAmount),
            avgBuyPrice: order.side === 'BUY' ? Number(order.avgFillPrice) : undefined,
            avgSellPrice: order.side === 'SELL' ? Number(order.avgFillPrice) : undefined,
            sharesBought: order.side === 'BUY' ? Number(order.totalFillShares) : 0,
            sharesSold: order.side === 'SELL' ? Number(order.totalFillShares) : 0,
            realizedPnl: 0,
            pnl: 0,
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
        if (position.status === 'ACTIVE') this.activePositions.push(position)
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

        // temporary, this should happen in todo below
        position.currentShares = 0
        position.currentShares = 0
        position.totalCapital = 0
        position.realizedPnl = 0
        position.totalSharesTraded = 0
        position.avgBuyPrice = 0
        position.avgSellPrice = 0
        position.sharesBought = 0
        position.sharesSold = 0

        position.orders.forEach((o: Order) => {
            if (o.side === 'BUY') {
                position.avgBuyPrice = this.calculateAvgPrice(position, o)
                position.sharesBought += Number(o.totalFillShares)
            }

            if (o.side === 'SELL') {
                position.avgSellPrice = this.calculateAvgPrice(position, o)
                position.sharesSold += Number(o.totalFillShares)
            }

            o.trades.forEach(t => position.symbol.includes(t.commissionAsset) ? position.totalCommission += t.commission : 0)
        })

        position.currentShares = position.sharesBought - position.sharesSold
        position.currentCapital = position.currentShares * (position.originalSide === 'BUY' ? Number(position.avgBuyPrice) : Number(position.avgSellPrice))
        if (position.originalSide === 'BUY') {
            position.totalCapital = position.sharesBought * Number(position.avgBuyPrice)
        }
        position.totalSharesTraded = Math.min(position.sharesBought, position.sharesSold)
        position.pnl = position.totalSharesTraded === 0 ? 0 : (Number(position.avgSellPrice) - Number(position.avgBuyPrice)) * position.totalSharesTraded
        position.pnl -= position.totalCommission

        if (position.currentShares === 0 && !position.orders.find(o => o.isActive)) position.status = 'CLOSED'
        this.savePosition(position)
        return position
    }

    calculateAvgPrice(position: Position, order: Order): number | undefined {
        const sideShares = order.side === 'BUY' ? position.sharesBought : position.sharesSold
        const sidePrice = order.side === 'BUY' ? position.avgBuyPrice : position.avgSellPrice

        if (sidePrice) {
            const totalAmount = (sidePrice * sideShares) + Number(order.totalFillAmount)
            const totalShares = sideShares + Number(order.totalFillAmount)
            return totalAmount / totalShares
        }

        if (order.totalFillShares && order.totalFillShares > 0) {
            return Number(order.totalFillAmount) / Number(order.totalFillShares)
        }
        return
    }

    async savePosition(position: Position) {
        console.log(`SAVING POSITION,id=${position.id}`)
        return upsert('positions', position, { id: position.id })
    }

    async restorePositions(filter: any = {}) {
        // TODO: grab all positions from mongo
    }
}