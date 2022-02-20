import {IRangeSliderOptions} from "../interfaces/range-slider-options";
import {SkinType, SliderType} from "../enums";

export class RangeSliderUtil {
    private static defaultConfig: IRangeSliderOptions<number> = {
        maxInterval: NaN,
        minInterval: NaN,
        from: NaN,
        fromMax: NaN,
        fromMin: NaN,
        to: NaN,
        toMax: NaN,
        toMin: NaN,
        block: false,
        decorateBoth: true,
        disable: false,
        extraClasses: "",
        forceEdges: false,
        fromFixed: false,
        fromShadow: false,
        grid: true,
        gridMargin: true,
        gridNum: 4,
        gridSnap: false,
        hideFromTo: false,
        hideMinMax: false,
        inputValuesSeparator: ";",
        keyboard: true,
        max: 100,
        min: 10,
        prettifyEnabled: true,
        prettifySeparator: " ",
        skin: SkinType.flat,
        step: 1,
        toFixed: false,
        toShadow: false,
        type: SliderType.single,
        values: [],
        valuesSeparator: "-",
        dragInterval: false
    };

    public static initializeConfiguration(configuration: Partial<IRangeSliderOptions<number | string>>, inputValues?: string): IRangeSliderOptions<number> {
        const configurationOutput = RangeSliderUtil.mergeConfigurations(RangeSliderUtil.defaultConfig, configuration);
        if (inputValues !== undefined && inputValues !== "") {
            const givenValues = inputValues.split(configuration.inputValuesSeparator || ";");

            if (givenValues.length !== 2) {
                throw Error(`Input value needs exactly 2 values (not ${givenValues.length} values) with a separator between (';' by default) `);
            }
            const values: (number | string)[] = [];
            if (givenValues[0]) {
                values.push(RangeSliderUtil.getValue(givenValues[0]));
            }
            if (givenValues[1]) {
                values.push(RangeSliderUtil.getValue(givenValues[1]));
            }

            if (configuration && configuration.values && configuration.values.length) {
                configurationOutput.from = configuration.values.indexOf(values[0]);
                configurationOutput.to = configuration.values.indexOf(values[1]);
            } else {
                configurationOutput.from = values[0] as number;
                configurationOutput.to = values[1] as number;
            }
        }

        return configurationOutput;
    }

    public static mergeConfigurations(baseConfiguration: IRangeSliderOptions<number | string>, newConfiguration?: Partial<IRangeSliderOptions<number | string>>, updateCheck?: { from: number; to: number }): IRangeSliderOptions<number> {
        const configurationOutput = RangeSliderUtil.convertConfiguration({...baseConfiguration, ...newConfiguration});
        return RangeSliderUtil.checkConfiguration(configurationOutput, updateCheck);
    }

    public static toFixed(number: number, decimals?: number): number {
        return parseFloat(number.toFixed(decimals ?? 20));
    }

    private static convertConfiguration(configuration: IRangeSliderOptions<number | string>): IRangeSliderOptions<number> {
        if (typeof configuration.min === "string") configuration.min = parseFloat(configuration.min);
        if (typeof configuration.max === "string") configuration.max = parseFloat(configuration.max);
        if (typeof configuration.from === "string") configuration.from = parseFloat(configuration.from);
        if (typeof configuration.to === "string") configuration.to = parseFloat(configuration.to);
        if (typeof configuration.step === "string") configuration.step = parseFloat(configuration.step);

        if (typeof configuration.fromMin === "string") configuration.fromMin = parseFloat(configuration.fromMin);
        if (typeof configuration.fromMax === "string") configuration.fromMax = parseFloat(configuration.fromMax);
        if (typeof configuration.toMin === "string") configuration.toMin = parseFloat(configuration.toMin);
        if (typeof configuration.toMax === "string") configuration.toMax = parseFloat(configuration.toMax);

        if (typeof configuration.gridNum === "string") configuration.gridNum = parseFloat(configuration.gridNum);

        return configuration as IRangeSliderOptions<number>;
    }

    private static checkConfiguration(configuration: IRangeSliderOptions<number>, updateCheck?: { from: number; to: number }): IRangeSliderOptions<number> {
        if (configuration.max < configuration.min) {
            configuration.max = configuration.min;
        }

        if (configuration.values && configuration.values.length) {
            configuration.min = 0;
            configuration.max = configuration.values.length - 1;
            configuration.step = 1;
            configuration.gridSnap = true;
        }

        if (isNaN(configuration.from)) {
            configuration.from = configuration.min;
        }

        if (isNaN(configuration.to)) {
            configuration.to = configuration.max;
        }

        if (configuration.type === "single") {

            if (configuration.from < configuration.min) configuration.from = configuration.min;
            if (configuration.from > configuration.max) configuration.from = configuration.max;

        } else {

            if (configuration.from < configuration.min) configuration.from = configuration.min;
            if (configuration.from > configuration.max) configuration.from = configuration.max;

            if (configuration.to < configuration.min) configuration.to = configuration.min;
            if (configuration.to > configuration.max) configuration.to = configuration.max;


            if (updateCheck?.from) {

                if (updateCheck?.from !== configuration.from) {
                    if (configuration.from > configuration.to) configuration.from = configuration.to;
                }
                if (updateCheck?.to !== configuration.to) {
                    if (configuration.to < configuration.from) configuration.to = configuration.from;
                }
            }

            if (configuration.from > configuration.to) configuration.from = configuration.to;
            if (configuration.to < configuration.from) configuration.to = configuration.from;

        }

        if (isNaN(configuration.step) || !configuration.step || configuration.step < 0) {
            configuration.step = 1;
        }

        if (configuration.from < configuration.fromMin) {
            configuration.from = configuration.fromMin;
        }

        if (configuration.from > configuration.fromMax) {
            configuration.from = configuration.fromMax;
        }

        if (configuration.to < configuration.toMin) {
            configuration.to = configuration.toMin;
        }

        if (configuration.from > configuration.toMax) {
            configuration.to = configuration.toMax;
        }

        if (isNaN(configuration.minInterval) || !configuration.minInterval || configuration.minInterval < 0) {
            configuration.minInterval = 0;
        }

        if (isNaN(configuration.maxInterval) || !configuration.maxInterval || configuration.maxInterval < 0) {
            configuration.maxInterval = 0;
        }

        if (configuration.minInterval && configuration.minInterval > configuration.max - configuration.min) {
            configuration.minInterval = configuration.max - configuration.min;
        }

        if (configuration.maxInterval && configuration.maxInterval > configuration.max - configuration.min) {
            configuration.maxInterval = configuration.max - configuration.min;
        }
        return configuration;
    }

    private static getValue(givenValues: string): string | number {
        const parsedValue = parseFloat(givenValues[0]);
        if (!isNaN(parsedValue)) {
            return parsedValue;
        } else {
            return givenValues[0];
        }
    }
}
