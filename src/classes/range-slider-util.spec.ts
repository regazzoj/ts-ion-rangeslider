import { RangeSliderUtil } from "./range-slider-util"
import { SkinType, SliderType } from "../enums"

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

  test("configuration with from bigger than to", () => {
    const options = { from: -50, to: -100, min: -100, max: -50, type: SliderType.double }
    const optionsAfterCheck = { from: -100, to: -100, min: -100, max: -50, type: SliderType.double }
    const expectedConfiguration = { ...defaultConfiguration, ...optionsAfterCheck }
    expect(RangeSliderUtil.initializeConfiguration(options)).toStrictEqual(expectedConfiguration)
  })

  test("configuration with string values", () => {
    const options = {
      from: "-50",
      to: "-100",
      min: "-100",
      max: "-50",
      step: "2",
      fromMin: "-100",
      fromMax: "-80",
      toMin: "-80",
      toMax: "-50",
      type: SliderType.double
    }
    const optionsAfterConvert = {
      from: -100,
      to: -80,
      min: -100,
      max: -50,
      step: 2,
      fromMin: -100,
      fromMax: -80,
      toMin: -80,
      toMax: -50,
      type: SliderType.double
    }
    const expectedConfiguration = { ...defaultConfiguration, ...optionsAfterConvert }
    expect(RangeSliderUtil.initializeConfiguration(options)).toStrictEqual(expectedConfiguration)
  })

  test("configuration with given values", () => {
    const options = {
      from: -2,
      to: 2,
      grid: true,
      gridMargin: true,
      gridNum: 4,
      gridSnap: false,
      hideFromTo: false,
      hideMinMax: false,
      fromShadow: true,
      toShadow: false,
      fromMin: 1,
      fromMax: 2,
      toMin: 1,
      toMax: 3,
      type: SliderType.double,
      values: ["a", "b", "c", "d"],
      valuesSeparator: ","
    }
    const optionsAfterConvert = {
      from: 1,
      to: 2,
      fromMin: 1,
      fromMax: 2,
      fromShadow: true,
      gridSnap: true,
      toMin: 1,
      toMax: 3,
      min: 0,
      max: 3,
      type: SliderType.double,
      values: ["a", "b", "c", "d"],
      valuesSeparator: ","
    }
    const expectedConfiguration = { ...defaultConfiguration, ...optionsAfterConvert }
    expect(RangeSliderUtil.initializeConfiguration(options)).toStrictEqual(expectedConfiguration)
  })
})
