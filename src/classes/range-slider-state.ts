import {IRangeSliderOptions} from "../interfaces/range-slider-options";
import {SliderType} from "../enums";
import {RangeSliderUtil} from "./range-slider-util";

export class RangeSliderState {
    private readonly customValues: (number | string)[] = [];
    private readonly prettifiedValues: (number | string)[] = [];
    private readonly isPrettifyEnabled: boolean;
    private readonly prettifySeparator: string;
    private readonly _prettify: (value: number) => string;
    private readonly _min: number;
    private readonly _max: number;
    private readonly _step: number;
    private readonly isSnapEnabled: boolean;
    private readonly labelsCount: number;
    private readonly prefix: string;
    private readonly postfix: string;
    private readonly maxPostfix: string;
    private readonly doubleLabelsDecorated: boolean;
    private readonly valuesSeparator: string;

    constructor(configuration: IRangeSliderOptions<number>) {
        this.isPrettifyEnabled = configuration.prettifyEnabled;
        if (!this.isPrettifyEnabled) {
            this._prettify = (value) => (value.toString(10));
        } else {
            if (configuration.prettify && typeof configuration.prettify === "function") {
                this._prettify = configuration.prettify;
            } else {
                this._prettify = (value) => this.defaultPrettify(value.toString(10));
            }
        }

        this.prettifySeparator = configuration.prettifySeparator;

        this.prefix = configuration.prefix ?? "";
        this.postfix = configuration.postfix ?? "";
        this.maxPostfix = configuration.maxPostfix ?? "";

        if (!configuration.gridSnap) {
            this.labelsCount = configuration.gridNum;
        }

        this._min = configuration.min;
        this._max = configuration.max;
        this._step = configuration.step;
        if (configuration.values.length > 0) {
            this.isSnapEnabled = true;
            this.prettifyValues(configuration.values);
        } else {
            this.isSnapEnabled = configuration.gridSnap;
        }

        this.doubleLabelsDecorated = configuration.type === SliderType.double ? configuration.decorateBoth : false;
        this.valuesSeparator = configuration.valuesSeparator;
    }

    public get min() {
        return this._min;
    }

    public get max() {
        return this._max;
    }

    public get step() {
        return this._step;
    }

    public prettify(value: number): string {
        return this._prettify(value);
    }

    public convertToValue(percent: number): number {
        if (percent === 0) {
            return this.min;
        }
        if (percent === 100) {
            return this.max;
        }

        const decimals = RangeSliderState.getDecimals(this.step);
        return parseFloat(((((this.max - this.min) / 100) * percent) + this.min).toFixed(decimals));
    }

    public convertToPercent(value: number, noMin = false): number {
        const diapason = this.max - this.min;

        if (!diapason) {
            throw Error("Min and max can't be equal")
        }

        return RangeSliderUtil.toFixed((noMin ? value : value - this.min) / (diapason / 100));
    }

    private static getDecimals(value: number): number {
        return (value % 1 === 0 ? "" : value.toString(10).split(".")[1]).length;
    }

    public hasCustomValues(): boolean {
        return this.customValues.length > 0;
    }

    public getCustomValue(index: number) {
        this.checkIndex(index);
        return this.customValues[index];
    }

    public getValuePrettified(index: number) {
        this.checkIndex(index);
        return this.prettifiedValues[index];
    }

    public getGridLabelsCount(): number {
        const gridLabelsCount = !this.isSnapEnabled ? this.labelsCount + 1 : (this.max - this._min) / this.step;
        if (gridLabelsCount > 50) {
            return 51
        }
        return gridLabelsCount + 1;
    }

    public getStepAsPercent() {
        return (this.step * 100) / (this.max - this.min);
    }

    public getPercentAccordingToStep(percent: number): number {
        const stepAsPercents = this.getStepAsPercent();
        const rounded = Math.round(percent / stepAsPercents) * stepAsPercents;

        if (rounded >= 100) {
            return 100;
        }

        return RangeSliderUtil.toFixed(rounded);
    }

    public decorateMinValue(): string {
        return this.decorate(this._min);
    }

    public decorateMaxValue(): string {
        return this.decorate(this.max);
    }

    public decorateForCollapsedValues(from: number, to: number): string {
        if (this.doubleLabelsDecorated) {
            return `${this.decorate(from)}${this.valuesSeparator}${this.decorate(to)}`;
        }

        let fromCustom: number | string = from, toCustom: number | string = to;
        if (this.hasCustomValues()) {
            fromCustom = this.getValuePrettified(from);
            toCustom = this.getValuePrettified(to);
        }
        if (to === this.max) {
            return this._decorateStringWithMaxPostfix(`${fromCustom}${this.valuesSeparator}${toCustom}`)
        }
        return this._decorateString(`${fromCustom}${this.valuesSeparator}${toCustom}`)
    }

    public decorate(value: number): string {
        if (this.hasCustomValues()) {
            return this._decorateCustomValue(this.getValuePrettified(value));
        }
        return this._decorate(value);
    }

    private _decorateCustomValue(value: number | string): string {
        if (this.maxPostfix && value === this.getValuePrettified(this.max)) {
            return this._decorateStringWithMaxPostfix(value); //`${this.prefix}${value}${this.maxPostfix}${this.postfix ? ` ${this.postfix}` : ""}`;
        }
        return this._decorateString(value); //`${this.prefix}${value}${this.postfix}`;
    }

    private _decorate(value: number): string {
        const prettifiedValue = this.prettify(value);
        if (this.maxPostfix && value == this.max) {
            return this._decorateStringWithMaxPostfix(prettifiedValue); //`${this.prefix}${prettifiedValue}${this.maxPostfix}${this.postfix ? ` ${this.postfix}` : ""}`;
        }
        return this._decorateStringWithMaxPostfix(prettifiedValue);//`${this.prefix}${prettifiedValue}${this.postfix}`;
    }

    private _decorateStringWithMaxPostfix(value: number | string): string {
        return `${this.prefix}${value}${this.maxPostfix}${this.postfix ? ` ${this.postfix}` : ""}`;
    }

    private _decorateString(value: number | string): string {
        return `${this.prefix}${value}${this.postfix}`;
    }

    private checkIndex(index: number) {
        if (!this.hasCustomValues()) {
            throw Error("No custom values given for the current range slider");
        }
        if (index < 0) {
            throw Error("Index can not be negative value");
        }
        if (index > this.customValues.length - 1) {
            throw Error("Index is bigger than the array length");
        }
    }

    private defaultPrettify(value: string): string {
        return value.replace(/(\d{1,3}(?=(?:\d\d\d)+(?!\d)))/g, "$1" + this.prettifySeparator);
    }

    private prettifyValues(values: (number | string)[]) {
        if (values.length <= 0) {
            return;
        }
        values.forEach((currentValue, index) => {
            let prettyValue: number | string = parseFloat(typeof currentValue === "string" ? currentValue : currentValue.toString(10));

            if (!isNaN(prettyValue)) {
                values[index] = prettyValue;
                prettyValue = this.prettify(prettyValue);
            } else {
                prettyValue = values[index];
            }
            this.customValues.push(currentValue)
            this.prettifiedValues.push(prettyValue);
        });
    }
}