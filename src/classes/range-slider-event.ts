import {IRangeSliderEvent} from "../interfaces/range-slider-event";
import {IRangeSliderConfiguration} from "../interfaces/range-slider-configuration";
import {IElementsCache} from "../interfaces/cache-range-slider";
import {SliderType} from "../enums";
import {RangeSliderConfigurationUtil} from "./range-slider-configuration-util";

export class RangeSliderEvent implements IRangeSliderEvent {
    readonly from: number;
    readonly fromPercent: number;
    readonly fromPretty: string;
    readonly fromValue: number | string;
    readonly input: HTMLInputElement;
    readonly max: number;
    readonly maxPretty: string;
    readonly min: number;
    readonly minPretty: string;
    readonly slider: Element;
    readonly to: number;
    readonly toPercent: number;
    readonly toPretty: string;
    readonly toValue: number | string;

    constructor(configuration: IRangeSliderConfiguration<number>,cache: IElementsCache, percents: { singleReal: number; fromReal:number; toReal: number}) {
        this.slider = cache.slider;
        this.input = cache.input;
        this.min = configuration.min;
        this.max = configuration.max;

        if(configuration.type === SliderType.single) {
            this.fromPercent = percents.singleReal;
        } else {
            this.fromPercent = percents.fromReal;
        }

        this.from = RangeSliderConfigurationUtil.convertToValue(configuration.min, configuration.max, configuration.step,this.fromPercent);
        this.fromPretty = RangeSliderConfigurationUtil.prettify(configuration, this.from);

        if (configuration.values.length) {
            this.fromValue = configuration.values[this.from];
        } else {
            this.minPretty = RangeSliderConfigurationUtil.prettify(configuration,this.min);
            this.maxPretty = RangeSliderConfigurationUtil.prettify(configuration,this.max);
        }

        if (configuration.type === SliderType.double) {
            this.toPercent = percents.toReal;
            this.to = RangeSliderConfigurationUtil.convertToValue(configuration.min, configuration.max, configuration.step,percents.toReal);
            this.toPretty = RangeSliderConfigurationUtil.prettify(configuration,this.to);

            if (configuration.values.length) {
                this.fromValue = configuration.values[this.from];
                this.toValue = configuration.values[this.to];
            }
        }
    }
}