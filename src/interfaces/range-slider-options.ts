import {SkinType, SliderType} from "../enums";
import {IRangeSliderEvent} from "./range-slider-event";

export interface IBaseRangeSliderOptions {
    // Set slider theme [Default: flat]
    skin: SkinType;
    // Choose slider type, could be `single` - for one handle, or `double` for two handles [Default: single]
    type: SliderType;
    // Set minimum diapason between sliders. Only for **double** type [Default: -]
    minInterval: number;
    // Set minimum maximum between sliders. Only for **double** type [Default: -]
    maxInterval: number;
    // Allow user to drag whole range. Only for **double** type [Default: false]
    dragInterval: boolean;
    // Set up your own array of possible slider values. They could be numbers or strings. If the values array is set up, min, max and step param, can no longer be changed [Default: []]
    values: (number | string)[];
    // Fix position of left (or single) handle [Default: false]
    fromFixed: boolean;
    // Highlight the limits for left handle [Default: false]
    fromShadow: boolean;
    // Fix position of right handle [Default: false]
    toFixed: boolean;
    // Highlight the right handle [Default: false]
    toShadow: boolean;
    // Improve readability of long numbers: 10000000 &rarr; 10 000 000 [Default: true]
    prettifyEnabled: boolean;
    // Set up your own separator for long numbers: 10000000 &rarr; 10,000,000 etc. [Default:  ]
    prettifySeparator: string;
    // Set up your own prettify function. Can be anything. For example, you can set up unix time as slider values and than transform them to cool looking dates [Default: null]
    prettify?: (num: number) => string;
    // Sliders handles and tooltips will be always inside it's container [Default: false]
    forceEdges: boolean;
    // Activates keyboard controls. Move left: &larr;, &darr;, A, S. Move right: &rarr;, &uarr;, W, D. [Default: true]
    keyboard: boolean;
    // Enables grid of values above the slider [Default: true]
    grid: boolean;
    // Set left and right grid gaps [Default: true]
    gridMargin: boolean;
    // Snap grid to sliders step (step param). If activated, grid_num will not be used. Max steps = 50 [Default: false]
    gridSnap: boolean;
    // Hides **min** and **max** labels [Default: false]
    hideMinMax: boolean;
    // Hides **from** and **to** labels [Default: false]
    hideFromTo: boolean;
    // Set prefix for values. Will be set up right before the number: **$**100 [Default: ]
    prefix?: string;
    // Set postfix for values. Will be set up right after the number: 100**k** [Default: ]
    postfix?: string;
    // Special postfix, used only for maximum value. Will be showed after handle will reach maximum right position. For example **0 — 100+** [Default: ]
    maxPostfix?: string;
    // Used for **double** type and only if prefix or postfix was set up. Determine how to decorate close values. For example: **$10k — $100k** or **$10 — 100k** [Default: true]
    decorateBoth: boolean;
    // Set your own separator for close values. Used for **double** type. Default: **10 — 100**. Or you may set: **10 to 100, 10 + 100, 10 &rarr; 100** etc. [Default:  - ]
    valuesSeparator: string;
    // Separator for **double** values in input value property. `<input value="25;42"> [Default:  ; ]
    inputValuesSeparator: string;
    // Locks slider and makes it inactive. Input is disabled too. Invisible to forms [Default: false]
    disable: boolean;
    // Locks slider and makes it inactive. Input is NOT disabled. Can be send with forms [Default: false]
    block: boolean;
    // Traverse extra CSS-classes to sliders container [Default: —]
    extraClasses: string;
    // Scope for callbacks. Pass any object [Default: null]
    callbackScope?: object;
    // Callback. Is called on slider start. Gets all slider data as a 1st attribute [Default: null]
    onStart?: (obj: IRangeSliderEvent) => void;
    // Callback. IS called on each values change. Gets all slider data as a 1st attribute [Default: null]
    onChange?: (obj: IRangeSliderEvent) => void;
    // Callback. Is called when user releases handle. Gets all slider data as a 1st attribute [Default: null]
    onFinish?: (obj: IRangeSliderEvent) => void;
    // Callback. Is called when slider is modified by external methods `update` or `reset [Default: null]
    onUpdate?: (obj: IRangeSliderEvent) => void;
}

export interface IRangeSliderOptions<T> extends IBaseRangeSliderOptions {
    // Set slider minimum value [Default: 10]
    min: T;
    // Set slider maximum value [Default: 100]
    max: T;
    // Set start position for left handle (or for single handle) [Default: min]
    from: T;
    // Set start position for right handle [Default: max]
    to: T;
    // Set sliders step. Always > 0. Could be fractional [Default: 1]
    step: T;
    // Set minimum limit for left (or single) handle [Default: min]
    fromMin: T;
    // Set maximum limit for left (or single) handle [Default: max]
    fromMax: T;
    // Set minimum limit for right handle [Default: min]
    toMin: T;
    // Set maximum limit for right handle [Default: max]
    toMax: T;
    // Number of grid units [Default: 4]
    gridNum: T;
}