# TBD Trader

This project aims to provide a consolidated platform for algorithm model trading where a single model can be written, monitored, and setup to trade across many different exchanges assets, and even asset classes (cryptos, stocks, etc...).  Connections can be established across a variety of provided (exchanges, market data providers, twitter, etc...) and turned on and off in different strategies.  These connections will generate messages that will pass through a translation layer into a common format to be evaluated and passed on to the strategy as events.

Custom strategies will be created (eventually in the web application) that can consume events and make decisions to enter and exit trades with a broker (or across brokers).  The custom strategies will extend base classes provided by the platform that will handle the bi-directionaly communication between all providers.  This includes listening to providers as well as placing and managing order and positions across brokers or exchanges.


## Contributors
[![GitHub contributors](https://img.shields.io/github/contributors/cdnjs/cdnjs.svg?style=flat)]()  

## Hits
[![HitCount](http://hits.dwyl.io/tterb/Hyde.svg)](http://hits.dwyl.io/tterb/Hyde)
[![Implementations](https://img.shields.io/badge/%F0%9F%92%A1-implementations-8C8E93.svg?style=flat)](https://github.com/kentcdodds/all-contributors/blob/master/other/IMPLEMENTATIONS.md)  

<br>

## Package Managers
#### NPM  
[![NPM Version](https://img.shields.io/npm/v/npm.svg?style=flat)]()
[![NPM License](https://img.shields.io/npm/l/all-contributors.svg?style=flat)](https://github.com/tterb/hyde/blob/master/LICENSE)
[![NPM Downloads](https://img.shields.io/npm/dt/express.svg?style=flat)]()  
[![Dependecy Status](https://david-dm.org/tterb/Hyde.svg)](https://david-dm.org/tterb/Hyde)  
[![devDependencies Status](https://david-dm.org/tterb/Hyde/dev-status.svg)](https://david-dm.org/tterb/Hyde?type=dev)  
[![NPM](https://nodei.co/npm/electron-download.png?downloads=true)](https://www.npmjs.com/package/electron-download)  


npm install
copy config.dist.ts to config.ts and update keys