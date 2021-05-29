# TBD Trader

This project aims to provide a consolidated platform for algorithm model trading where a single model can be written, monitored, and setup to trade across many different exchanges assets, and even asset classes (cryptos, stocks, etc...).  Connections can be established across a variety of provided (exchanges, market data providers, twitter, etc...) and turned on and off in different strategies.  These connections will generate messages that will pass through a translation layer into a common format to be evaluated and passed on to the strategy as events.

Custom strategies will be created (eventually in the web application) that can consume events and make decisions to enter and exit trades with a broker (or across brokers).  The custom strategies will extend base classes provided by the platform that will handle the bi-directionaly communication between all providers.  This includes listening to providers as well as placing and managing order and positions across brokers or exchanges.

[![Master Coverage](https://img.shields.io/coveralls/github/edbalogh/TBDTrading/master.svg)](https://coveralls.io/github/edbalogh/TBDTrading?branch=master)

## installation
npm install
copy config.dist.ts to config.ts and update keys
npm link


## contributing
Coming soon...currently in the planning and organizational phase