import { Mode, Currency } from './basic'
import { Connection, ProviderService } from './collectors'
import { BrokerOptions } from './broker'

export type SymbolStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'PENDING'
export interface SymbolDetails {
    symbol: string,
    status: SymbolStatus,
    providerId: string,
    reference: boolean,
    pair?: [string, string],
    connections?: Connection[]
}

export type BotStatus = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'STOPPED' | 'PENDING'
export interface BotDetails {
    id: string,
    name: string,
    strategyId: string,
    mode: Mode,
    status: BotStatus,
    providers: ProviderService[],
    symbols: SymbolDetails[],
    baseCurrency: Currency,
    promotedFrom?: string,
    lastPingTime?: Date,
    strategyOptions: StrategyOptions
}

export type StrategyStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
export interface StrategyOptions {
    id: string,
    name: string,
    class: string,
    parameterDetails: Map<string, any>    
}
