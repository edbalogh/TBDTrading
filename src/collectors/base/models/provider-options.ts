type ProviderType = 'Broker' | 'MarketData' | 'Other'

export interface ProviderOptions {
    id: string
    providerType: ProviderType,
    name: string
}
