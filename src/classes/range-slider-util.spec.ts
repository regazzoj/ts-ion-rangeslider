import {RangeSliderUtil} from "./range-slider-util"
import {SkinType, SliderType} from "../enums"

describe("RangeSliderUtil", () => {
    test("toFixed", () => {
        expect(RangeSliderUtil.toFixed(50.19489174919919)).toBe(50.19489174919919)
    })

    test("toFixed with 5 decimals", () => {
        expect(RangeSliderUtil.toFixed(50.19489174919919, 5)).toBe(50.19489)
    })

    const defaultConfiguration = {
        maxInterval: 0,
        minInterval: 0,
        from: 10,
        fromMax: NaN,
        fromMin: NaN,
        to: 100,
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
    }
    test("default configuration initialization", () => {
        expect(RangeSliderUtil.initializeConfiguration({})).toStrictEqual(defaultConfiguration)
    })

    const options = {from:-50,to:-100, min:-100, max: -50, type: SliderType.double}
    const expectedConfiguration = { ...defaultConfiguration, ...options, from: -100}

    test("configuration with from bigger than to", () => {
        expect(RangeSliderUtil.initializeConfiguration(options)).toStrictEqual(expectedConfiguration)
    })
})
