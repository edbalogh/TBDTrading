export function barEpochTimeToUTC(time: number) {
    if (time.toString().length <= 10) time *= 1000;
    return new Date(time);
}
