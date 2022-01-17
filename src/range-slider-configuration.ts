export enum SliderType {
    double = "double",
    single = "single"
}

export interface IRangeSliderConfiguration {
    skin: 'flat' | 'big' | 'modern' | 'round' | 'sharp' | 'square'; // Set slider theme [Default: flat]
    type: SliderType;    // Choose slider type, could be `single` - for one handle, or `double` for two handles [Default: single]
    min: number;    // Set slider minimum value [Default: 10]
    max: number;    // Set slider maximum value [Default: 100]
    from?: number;    // Set start position for left handle (or for single handle) [Default: min]
    to?: number;    // Set start position for right handle [Default: max]
    step: number;    // Set sliders step. Always > 0. Could be fractional [Default: 1]
    min_interval?: number;    // Set minimum diapason between sliders. Only for **double** type [Default: -]
    max_interval?: number;    // Set minimum maximum between sliders. Only for **double** type [Default: -]
    drag_interval: boolean;   // Allow user to drag whole range. Only for **double** type [Default: false]
    values: (number | string)[];     // Set up your own array of possible slider values. They could be numbers or strings. If the values array is set up, min, max and step param, can no longer be changed [Default: []]
    p_values: (number | string)[];
    from_fixed: boolean;   // Fix position of left (or single) handle [Default: false]
    from_min?: number;    // Set minimum limit for left (or single) handle [Default: min]
    from_max?: number;    // Set maximum limit for left (or single) handle [Default: max]
    from_shadow: boolean;   // Highlight the limits for left handle [Default: false]
    to_fixed: boolean;   // Fix position of right handle [Default: false]
    to_min?: number;    // Set minimum limit for right handle [Default: min]
    to_max?: number;    // Set maximum limit for right handle [Default: max]
    to_shadow: boolean;   // Highlight the right handle [Default: false]
    prettify_enabled: boolean;   // Improve readability of long numbers: 10000000 &rarr; 10 000 000 [Default: true]
    prettify_separator: string;    // Set up your own separator for long numbers: 10000000 &rarr; 10,000,000 etc. [Default:  ]
    prettify?: (num: number) => string; // Set up your own prettify function. Can be anything. For example, you can set up unix time as slider values and than transform them to cool looking dates [Default: null]
    force_edges: boolean;   // Sliders handles and tooltips will be always inside it's container [Default: false]
    keyboard: boolean;   // Activates keyboard controls. Move left: &larr;, &darr;, A, S. Move right: &rarr;, &uarr;, W, D. [Default: true]
    grid: boolean;   // Enables grid of values above the slider [Default: true]
    grid_margin: boolean;   // Set left and right grid gaps [Default: true]
    grid_num: number;    // Number of grid units [Default: 4]
    grid_snap: boolean;   // Snap grid to sliders step (step param). If activated, grid_num will not be used. Max steps = 50 [Default: false]
    hide_min_max: boolean;   // Hides **min** and **max** labels [Default: false]
    hide_from_to: boolean;   // Hides **from** and **to** labels [Default: false]
    prefix?: string;    // Set prefix for values. Will be set up right before the number: **$**100 [Default: ]
    postfix?: string;    // Set postfix for values. Will be set up right after the number: 100**k** [Default: ]
    max_postfix?: string;    // Special postfix, used only for maximum value. Will be showed after handle will reach maximum right position. For example **0 — 100+** [Default: ]
    decorate_both: boolean;   // Used for **double** type and only if prefix or postfix was set up. Determine how to decorate close values. For example: **$10k — $100k** or **$10 — 100k** [Default: true]
    values_separator: string;    // Set your own separator for close values. Used for **double** type. Default: **10 — 100**. Or you may set: **10 to 100, 10 + 100, 10 &rarr; 100** etc. [Default:  - ]
    input_values_separator: string;    // Separator for **double** values in input value property. `<input value="25;42"> [Default:  ; ]
    disable: boolean;   // Locks slider and makes it inactive. Input is disabled too. Invisible to forms [Default: false]
    block: boolean;   // Locks slider and makes it inactive. Input is NOT disabled. Can be send with forms [Default: false]
    extra_classes: string;    // Traverse extra CSS-classes to sliders container [Default: —]
    scope?: any;       // Scope for callbacks. Pass any object [Default: null]
    onStart?: (obj: RangeSliderEvent) => void; // Callback. Is called on slider start. Gets all slider data as a 1st attribute [Default: null]
    onChange?: (obj: RangeSliderEvent) => void; // Callback. IS called on each values change. Gets all slider data as a 1st attribute [Default: null]
    onFinish?: (obj: RangeSliderEvent) => void; // Callback. Is called when user releases handle. Gets all slider data as a 1st attribute [Default: null]
    onUpdate?: (obj: RangeSliderEvent) => void; // Callback. Is called when slider is modified by external methods `update` or `reset [Default: null]
}

export interface RangeSliderEvent {
    input: HTMLInputElement;    // Input DOM element
    slider: Element;            // Slider DOM element
    min: number;                // MIN value
    max: number;                // MAX value
    from: number;               // FROM value (left or single handle)
    from_percent: number;       // FROM value in percents
    from_value: number | string // FROM value of array values (if used)
    to: number;                 // TO value (right handle in double type)
    to_percent: number;         // TO value in percents
    to_value: number | string;  // TO value of array values (if used)
    min_pretty: string;         // MIN prettified (if used)
    max_pretty: string;         // MAX prettified (if used)
    from_pretty: string;        // FROM prettified (if used)
    to_pretty: string;          // TO prettified (if used)
}

export class RangeSliderConfigurationUtil {
    private static defaultConfig: IRangeSliderConfiguration = {
        block: false,
        decorate_both: true,
        disable: false,
        extra_classes: "",
        force_edges: false,
        from_fixed: false,
        from_shadow: false,
        grid: true,
        grid_margin: true,
        grid_num: 4,
        grid_snap: false,
        hide_from_to: false,
        hide_min_max: false,
        input_values_separator: ";",
        keyboard: true,
        max: 100,
        min: 10,
        prettify_enabled: true,
        prettify_separator: " ",
        skin: "flat",
        step: 1,
        to_fixed: false,
        to_shadow: false,
        type: SliderType.single,
        values: [],
        p_values: [],
        values_separator: "-",
        drag_interval: false
    }

    public static initializeConfiguration(configuration: Partial<IRangeSliderConfiguration>, inputValues?: string): IRangeSliderConfiguration {
        const configurationOutput = RangeSliderConfigurationUtil.mergeConfigurations(RangeSliderConfigurationUtil.defaultConfig, configuration);
        if (inputValues !== undefined && inputValues !== '') {
            const givenValues = inputValues.split(configuration.input_values_separator || ';');

            if (givenValues.length < 2) {
                throw Error("Input value needs two values with a separator between (';' by default)");
            }
            const values: (number | string)[] = [];
            if (givenValues[0]) {
                values.push(RangeSliderConfigurationUtil.getValue(givenValues[0]));
            }
            if (givenValues[1]) {
                values.push(RangeSliderConfigurationUtil.getValue(givenValues[1]));
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

    public static mergeConfigurations(baseConfiguration: IRangeSliderConfiguration, newConfiguration: Partial<IRangeSliderConfiguration>, updateCheck?: { from: number, to: number }): IRangeSliderConfiguration {
        const configurationOutput = {...baseConfiguration, ...newConfiguration};
        RangeSliderConfigurationUtil.checkConfiguration(configurationOutput, updateCheck);
        return configurationOutput;
    }

    public static checkConfiguration(configuration: IRangeSliderConfiguration, updateCheck?: { from: number, to: number }): Partial<IRangeSliderConfiguration> {
        // r = this.result
        if (typeof configuration.min === 'string') configuration.min = parseFloat(configuration.min);
        if (typeof configuration.max === 'string') configuration.max = parseFloat(configuration.max);
        if (typeof configuration.from === 'string') configuration.from = parseFloat(configuration.from);
        if (typeof configuration.to === 'string') configuration.to = parseFloat(configuration.to);
        if (typeof configuration.step === 'string') configuration.step = parseFloat(configuration.step);

        if (typeof configuration.from_min === 'string') configuration.from_min = parseFloat(configuration.from_min);
        if (typeof configuration.from_max === 'string') configuration.from_max = parseFloat(configuration.from_max);
        if (typeof configuration.to_min === 'string') configuration.to_min = parseFloat(configuration.to_min);
        if (typeof configuration.to_max === 'string') configuration.to_max = parseFloat(configuration.to_max);

        if (typeof configuration.grid_num === 'string') configuration.grid_num = parseFloat(configuration.grid_num);

        if (configuration.max < configuration.min) {
            configuration.max = configuration.min;
        }

        RangeSliderConfigurationUtil.updatePrettyValues(configuration);

        if (typeof configuration.from !== 'number' || isNaN(configuration.from)) {
            configuration.from = configuration.min;
        }

        if (typeof configuration.to !== 'number' || isNaN(configuration.to)) {
            configuration.to = configuration.max;
        }
        
        if (configuration.type === 'single') {

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

        if (typeof configuration.step !== 'number' || isNaN(configuration.step) || !configuration.step || configuration.step < 0) {
            configuration.step = 1;
        }

        if (typeof configuration.from_min === 'number' && configuration.from < configuration.from_min) {
            configuration.from = configuration.from_min;
        }

        if (typeof configuration.from_max === 'number' && configuration.from > configuration.from_max) {
            configuration.from = configuration.from_max;
        }

        if (typeof configuration.to_min === 'number' && configuration.to < configuration.to_min) {
            configuration.to = configuration.to_min;
        }

        if (typeof configuration.to_max === 'number' && configuration.from > configuration.to_max) {
            configuration.to = configuration.to_max;
        }

        // if (r) {
        //     if (r.min !== configuration.min) {
        //         r.min = configuration.min;
        //     }
        //
        //     if (r.max !== configuration.max) {
        //         r.max = configuration.max;
        //     }
        //
        //     if (r.from < r.min || r.from > r.max) {
        //         r.from = configuration.from;
        //     }
        //
        //     if (r.to < r.min || r.to > r.max) {
        //         r.to = configuration.to;
        //     }
        // }

        if (typeof configuration.min_interval !== 'number' || isNaN(configuration.min_interval) || !configuration.min_interval || configuration.min_interval < 0) {
            configuration.min_interval = 0;
        }

        if (typeof configuration.max_interval !== 'number' || isNaN(configuration.max_interval) || !configuration.max_interval || configuration.max_interval < 0) {
            configuration.max_interval = 0;
        }

        if (configuration.min_interval && configuration.min_interval > configuration.max - configuration.min) {
            configuration.min_interval = configuration.max - configuration.min;
        }

        if (configuration.max_interval && configuration.max_interval > configuration.max - configuration.min) {
            configuration.max_interval = configuration.max - configuration.min;
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

    private static updatePrettyValues(configuration: IRangeSliderConfiguration) {
        if (configuration.values.length <= 0) {
            return;
        }
        configuration.p_values = [];
        configuration.min = 0;
        configuration.max = configuration.values.length - 1;
        configuration.step = 1;
        configuration.grid_num = configuration.max;
        configuration.grid_snap = true;
        configuration.values.forEach((currentValue, index) => {
            let value: number | string = parseFloat(typeof currentValue === "string" ? currentValue : currentValue.toString(10));

            if (!isNaN(value)) {
                configuration.values[index] = value;
                value = RangeSliderConfigurationUtil.prettify(configuration, value);
            } else {
                value = configuration.values[index];
            }

            configuration.p_values.push(value);
        });
    }

    public static prettify(configuration: IRangeSliderConfiguration, value: number): string {
        if (!configuration.prettify_enabled) {
            return value.toString(10);
        }

        if (configuration.prettify && typeof configuration.prettify === 'function') {
            return configuration.prettify(value);
        } else {
            return RangeSliderConfigurationUtil.defaultPrettify(configuration, value.toString(10));
        }
    }

    private static defaultPrettify(configuration: IRangeSliderConfiguration, value: string): string {
        return value.replace(/(\d{1,3}(?=(?:\d\d\d)+(?!\d)))/g, '$1' + configuration.prettify_separator);
    }
}
