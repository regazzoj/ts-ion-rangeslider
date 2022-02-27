import {IRangeSliderEvent} from "../interfaces/range-slider-event"
import {SliderType} from "../enums"
import {RangeSliderState} from "./range-slider-state"

export class RangeSliderEvent implements IRangeSliderEvent {
    readonly from: number
    readonly fromPercent: number
    readonly fromPretty: string
    readonly fromValue: number | string
    readonly input: HTMLInputElement
    readonly max: number
    readonly maxPretty: string
    readonly min: number
    readonly minPretty: string
    readonly slider: Element
    readonly to: number
    readonly toPercent: number
    readonly toPretty: string
    readonly toValue: number | string

    constructor(type: SliderType, state: RangeSliderState, input: HTMLInputElement, slider: Element, percents: { singleReal: number; fromReal:number; toReal: number}) {
        this.slider = slider
        this.input = input
        this.min = state.min
        this.max = state.max

        if(type === SliderType.single) {
            this.fromPercent = percents.singleReal
        } else {
            this.fromPercent = percents.fromReal
        }

        this.from = state.convertToValue(this.fromPercent)
        this.fromPretty = state.prettify(this.from)

        if (state.hasCustomValues()) {
            this.fromValue = state.getCustomValue(this.from)
        } else {
            this.minPretty = state.prettify(this.min)
            this.maxPretty = state.prettify(this.max)
        }

        if (type === SliderType.double) {
            this.toPercent = percents.toReal
            this.to = state.convertToValue(percents.toReal)
            this.toPretty = state.prettify(this.to)

            if (state.hasCustomValues()) {
                this.fromValue = state.getCustomValue(this.from)
                this.toValue = state.getCustomValue(this.to)
            }
        }
    }
}