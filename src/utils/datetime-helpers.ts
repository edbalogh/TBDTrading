export function barEpochTimeToUTC(time: number | string) {
    time = Number(time)
    if (time.toString().length <= 10) time *= 1000;
    return new Date(time);
}
