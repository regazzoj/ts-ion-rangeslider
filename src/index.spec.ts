import { SliderType, SkinType, RangeSlider } from "./index"

describe("Exports", () =>
{
  test("RangeSlider is exported", () => {
    expect(RangeSlider).toBeInstanceOf(Object)
  })

  test("SliderType is exported", () => {
    expect(SliderType).toBeInstanceOf(Object)
  })

  test("SkinType is exported", () => {
    expect(SkinType).toBeInstanceOf(Object)
  })
})

const count = {
  onChange: 0,
  onFinish: 0,
  onStart: 1,
  onUpdate: 2
}

describe("RangeSlider creation", () => {
  test("RangeSlider", () => {
    const div = document.createElement("div")
    const input = document.createElement("input")
    div.append(input)

    const sliderInputElement = new RangeSlider(input, {
      skin: SkinType.round,
      grid: true,
      gridMargin: true,
      gridNum: 4,
      gridSnap: false,
      hideFromTo: false,
      hideMinMax: false,
      onChange: () => --count.onChange,
      onFinish: () => --count.onFinish,
      onStart: () => --count.onStart,
      onUpdate: () => --count.onUpdate,
      type: SliderType.double,
      values: ["a", "b", "c"],
      valuesSeparator: ","
    })
    sliderInputElement.update({
      values: ["a", "b", "c", "d"]
    })

    sliderInputElement.reset()
    sliderInputElement.destroy()

    for (const countKey in count) {
      expect(count[countKey as keyof typeof count]).toBe(0)
    }
  })
})
