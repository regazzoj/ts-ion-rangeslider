import {IRangeSliderOptions} from "../interfaces/range-slider-options";
import {RangeSliderConfigurationUtil} from "./range-slider-configuration-util";
import {SliderType} from "../enums";

export class RangeSliderState {
    private readonly customValues: (number | string)[] = []; //old prettyValues
    private readonly prettifiedValues: (number | string)[] = []; //old prettyValues
    private readonly isPrettifyEnabled: boolean;
    private readonly prettifySeparator: string;
    private readonly _prettify: (value: number) => string;
    private readonly min: number;
    private readonly max: number;
    private readonly step: number;
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

        if (configuration.values.length > 0) {
            this.min = 0;
            this.max = configuration.values.length - 1;
            this.step = 1
            this.isSnapEnabled = true;
            this.prettifyValues(configuration.values);
        } else {
            this.min = configuration.min;
            this.max = configuration.max;
            this.step = configuration.step;
            this.isSnapEnabled = configuration.gridSnap;
        }

        this.doubleLabelsDecorated = configuration.type === SliderType.double ? configuration.decorateBoth : false;
        this.valuesSeparator = configuration.valuesSeparator;
    }

    public prettify(value: number): string {
        return this._prettify(value);
    }

    public convertToValue(percent: number): number {
        let minLength: number, maxLength: number,
            avgDecimals = 0,
            abs = 0,
            min = this.min,
            max = this.max;
        const step = this.step;

        const minDecimals = min.toString().split(".")[1],
            maxDecimals = max.toString().split(".")[1];

        if (percent === 0) {
            return min;
        }
        if (percent === 100) {
            return max;
        }


        if (minDecimals) {
            minLength = minDecimals.length;
            avgDecimals = minLength;
        }
        if (maxDecimals) {
            maxLength = maxDecimals.length;
            avgDecimals = maxLength;
        }
        if (minLength && maxLength) {
            avgDecimals = (minLength >= maxLength) ? minLength : maxLength;
        }

        if (min < 0) {
            abs = Math.abs(min);
            min = RangeSliderConfigurationUtil.toFixed(min + abs, avgDecimals);
            max = RangeSliderConfigurationUtil.toFixed(max + abs, avgDecimals);
        }

        let number = ((max - min) / 100 * percent) + min,
            result: number;
        const string = step.toString().split(".")[1];

        if (string) {
            number = +number.toFixed(string.length);
        } else {
            number = number / step;
            number = number * step;

            number = +number.toFixed(0);
        }

        if (abs) {
            number -= abs;
        }

        if (string) {
            result = +number.toFixed(string.length);
        } else {
            result = RangeSliderConfigurationUtil.toFixed(number);
        }

        if (result < this.min) {
            result = min;
        } else if (result > this.max) {
            result = max;
        }

        return result;
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
        const gridLabelsCount = !this.isSnapEnabled ? this.labelsCount + 1 : //4 by default + 1 for the max
            (this.max - this.min) / this.step;
        if (gridLabelsCount > 50) {
            return 51
        }
        return gridLabelsCount + 1;
    }

    public decorateMinValue(): string {
        return this.decorate(this.min);
    }

    public decorateMaxValue(): string {
        return this.decorate(this.max);
    }

    public decorateForCollapsedValues(from: number, to: number): string {
        if(this.doubleLabelsDecorated) {
            return `${this.decorate(from)}${this.valuesSeparator}${this.decorate(to)}`;
        }

        let fromCustom: number | string = from, toCustom: number | string = to;
        if(this.hasCustomValues()) {
            fromCustom = this.getValuePrettified(from);
            toCustom = this.getValuePrettified(to);
        }
        if(to === this.max) {
            return this._decorateStringWithMaxPostfix(`${fromCustom}${this.valuesSeparator}${toCustom}`)
        }
        return this._decorateString(`${fromCustom}${this.valuesSeparator}${toCustom}`)
    }

    public decorate(value: number): string {
        // eslint-disable-next-line no-console
        console.log(!!this.maxPostfix);
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
            // eslint-disable-next-line no-console
            console.log(index, this.customValues.length);
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