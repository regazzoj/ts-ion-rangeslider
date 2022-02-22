import {IRangeSliderOptions} from "./range-slider-options";

export interface IRangeSlider {
    destroy(): void;

    reset(): void;

    update(option: Partial<IRangeSliderOptions<number | string>>): void;
}