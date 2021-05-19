export interface MarketDataConnection {
    /**
     * Converts broker specific bar/candlestick to platform specific
     * @param brokerBar the broker bar to convert
     */

    translateBar(brokerBar: any): void
}
