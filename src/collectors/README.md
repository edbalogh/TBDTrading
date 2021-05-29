# Collectors
Collectors provide a standard approach to handle communication with different data providers with supported APIs.  This includes various market data providers, brokers/exchanges, and various other types of data source like twitter or market analysis vendors.  The data provided from these vendors is similar in nature but have different requirements to request the data and return the data back in a different structure which needs to be interpreted by the trading strategy.  This can make it difficult to write effective strategies that trade across exchanges and asset classes.

This project provides a common interface for communicating with these different data providers.  Each individual provider will have code that adheres to the common interface extending base classes that interact with other areas of the system.  This will allow a single strategy to be written that can be setup to trade across providers and even makes it possible to use the same strategy to trade stocks, crypto, and other asset classes.

## MarketData Providers
Market data providers produce fairly standard data across exchanges and asset classes (crypto, stocks, etc...) including candlesticks/bars, trades, and order books.  This information is used heavily to make trading decisions for technical analysis and price action strategies.  Each vendor has different requirements to request that data as well as different data formats that are returned.  The MarketDataProviderBase class is extended for each vendor to include custom methods for requesting and consuming marke data.

## Brokers/Exchanges
Connections to brokers and exchanges allow the system to coordinate order management with the vendors.  Common functions include things like placing, cancelling, and monitoring orders as well as keeping track of available balance information for making order sizing decisions as well as Profit/Loss reports.

## Other Providers
The system will allow for communication with any type of data provider that supports an API.  By it's nature, this provider type will be less 'standard' across sources and will rely on the specific strategies to understand the data that is being consumed.  Typyical providers in this category could include raw Twitter feed, various news providers, or specific market data analysis sites


# Folder Structure
The Collectors library contains sections for Base, Providers, and Templates.  

## Base
The Base area includes base classes with methods for communicating with the data providers in a common way.  Specific classes are created for any provider that exends these base classes and implements the required methods that make the specific requests and translates the return into the common structure.  This area also includes the common structures in the form of typescript types and interfaces.  There is a script for each type of provider supported (market-data, broker, and other-data) that is 'extended' by the provider specific classes.

## Providers
The Provider area contains folders for each data provider with subfolders that contain the provider specific code.  Custom connectors will be created and stored here in addition to the handful of providers supported by the platform out of the box. 

## Templates
The Template area will include templates that can be used as a starting point for each type of data provider.  These are intended to be examples and starting points only and will not include the specific code needed to build and actual provider.


# Class/Code Structure

## parameterDetails() method
Each class will contain a 'parameterDetails' method that contains the information for building out a form in the UI with the parameters that are available for each entity.

# WebSockets and Streaming
## Topics
*data.bar.<symbol>*
*data.book.<symbol>*
*broker.order.<symbol>*