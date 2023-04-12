export enum CallbackType {
    onChange = "onChange", onFinish = "onFinish", onStart = "onStart", onUpdate = "onUpdate"
}

export enum EventType {
    click = "click", down = "down", keyDown = "keyDown", move = "move", up = "up"
}

export enum RangeSliderElement {
    // common
    bar = ".irs-bar",
    from = ".irs-from",
    grid = ".irs-grid",
    line = ".irs-line",
    max = ".irs-max",
    min = ".irs-min",
    rangeSlider = ".irs",
    spanSingle = ".irs-single",
    to = ".irs-to",
    // single
    shadowSingle = ".shadow-single",
    singleHandle = ".irs-handle.single",
    // double
    shadowFrom = ".shadow-from",
    shadowTo = ".shadow-to",
    spanFrom = ".irs-handle.from",
    spanTo = ".irs-handle.to",
    // mask
    mask = ".irs-disable-mask"
}

export enum SkinType {
    flat = "flat", big = "big", modern = "modern", round = "round", sharp = "sharp", square = "square"
}

export enum SliderType {
    double = "double", single = "single"
}

export enum TargetType {
    base = "base", both = "both", bothOne = "bothOne", click = "click", from = "from", single = "single", to = "to"
}
