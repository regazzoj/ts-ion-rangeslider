import * as RangeSlider from "../src/classes/range-slider";
import {SkinType, SliderType} from "../src/enums";

test("RangeSlider", () => {
    const div = document.createElement("div");
    const input = document.createElement("input");
    div.append(input);

    const sliderInputElement = new RangeSlider.Slider(input, {
        skin: SkinType.round,
        grid: true,
        gridMargin: true,
        gridNum: 4,
        gridSnap: false,
        hideFromTo: false,
        hideMinMax: false,
        onChange: obj => console.log({...obj}),
        onFinish: obj => console.log({...obj}),
        onStart: obj => console.log({...obj}),
        onUpdate: obj => console.log({...obj}),
        type: SliderType.double,
        values: ["a", "b", "c"],
        valuesSeparator: ","
    });
    sliderInputElement.update({
        values: ["a", "b", "c", "d"]
    });
    sliderInputElement.reset();
    sliderInputElement.destroy();
});