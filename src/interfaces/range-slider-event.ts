export interface RangeSliderEvent {
    input: HTMLInputElement;    // Input DOM element
    slider: Element;            // Slider DOM element
    min: number;                // MIN value
    max: number;                // MAX value
    from: number;               // FROM value (left or single handle)
    fromPercent: number;       // FROM value in percents
    fromValue: number | string; // FROM value of array values (if used)
    to: number;                 // TO value (right handle in double type)
    toPercent: number;         // TO value in percents
    toValue: number | string;  // TO value of array values (if used)
    minPretty: string;         // MIN prettified (if used)
    maxPretty: string;         // MAX prettified (if used)
    fromPretty: string;        // FROM prettified (if used)
    toPretty: string;          // TO prettified (if used)
}