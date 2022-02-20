export class RangeSliderUtil {
    public static toFixed(number: number, decimals?: number): number {
        return parseFloat(number.toFixed(decimals ?? 20));
    }
}