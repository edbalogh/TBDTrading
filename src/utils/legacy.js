const _ = require('lodash');
const moment = require('moment-timezone');

module.exports = {
    logDetails(message, details = {}, executionId, symbol) {
        let logEntry = `${new Date(Date.now()).toISOString()}`
        if(executionId) logEntry += ` executionId=${executionId}`;
        if(symbol) logEntry += ` symbol=${symbol}`;
        logEntry += ` message=${JSON.stringify(message)}`;
        
        Object.keys(details).forEach((k) => {
            logEntry += ` ${k}=${JSON.stringify(details[k])}`
        });

        console.log(logEntry);
    },

    setEnvironmentFromConfig() {
        // Config
        const config = require(`../config/${process.env['ENV']}`);

        // set environment variables from config
        _.mapValues(config.env, (v, k) => {
            process.env[k] = v;
        });
    },

    barEpochTimeToUTC(time) {
        if (time.toString().length <= 10) time *= 1000;
        return new Date(time);
    },

    getEasternTime(time) {
        return moment(time).tz('America/New_York');
    },

    currentTime() {
        return new Date();
    },

    epochTimeIsToday(time) {
        return this.barEpochTimeToUTC(time).toISOString().slice(0,10) === new Date().toISOString().slice(0,10);
    },

    marketIsOpenAt(time) {
        const tzAdjusted = moment(time).tz('America/New_York');
        const isOpen = ((tzAdjusted.hour() == 9 && tzAdjusted.minute() >= 30)  || tzAdjusted.hour() >= 10) && tzAdjusted.hour() < 16;
        return isOpen || true;
    },

    buildMongoQueryFromRequest(query, allowed) {
        const mongoQuery = {};
        _.forEach(query, (v, k) => {
            if(allowed.includes(k)) {
                mongoQuery[k] = v; 
            }
        })
        return mongoQuery;
    }
};