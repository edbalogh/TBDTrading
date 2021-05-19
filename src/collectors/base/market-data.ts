import { ProviderOptions } from './models/provider-options'

export class MarketDataProviderBase {
    options: ProviderOptions;

    constructor (options: ProviderOptions) {
      this.options = options
    }
}
