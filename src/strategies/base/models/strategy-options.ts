import { ProviderService, Connection } from '../../../collectors/base/models/provider-options'
import { Mode, Currency } from '../../../common/definitions/basic'

export type StrategyStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
export interface StrategyOptions {
    id: string,
    name: string,
    class: string,
    parameterDetails: Map<string, any>    
}

export type SymbolStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'PENDING'
export interface SymbolDetails {
    symbol: string,
    status: SymbolStatus,
    providerId: string,
    reference: boolean,
    pair?: [string, string],
    connections?: Connection[]
}

export type ExecutionStatus = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'STOPPED' | 'PENDING'
export interface Execution {
    id: string,
    name: string,
    strategyId: string,
    mode: Mode,
    status: ExecutionStatus,
    providers: ProviderService[],
    symbols: SymbolDetails[],
    baseCurrency: Currency,
    promotedFrom?: string,
    lastPingTime?: Date,
    lastBarProcessed?: Date
}
