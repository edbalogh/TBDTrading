import { barEpochTimeToUTC } from '../datetime-helpers'

describe("DateTime Helper Utility Tests", () => {
    test('should convert bar epoch numbers to accurate date', () => {
        expect(barEpochTimeToUTC(1622384491000)).toStrictEqual(barEpochTimeToUTC(1622384491))
        expect(new Date('2021-05-30T14:21:31.000Z').getTime()).toStrictEqual(1622384491000)
        expect(barEpochTimeToUTC('1622384491000')).toStrictEqual(barEpochTimeToUTC(1622384491000))
    })
})