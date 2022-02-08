import {SliderType} from "../enums";
import {Template} from "./template";
import {IRangeSliderOptions} from "../interfaces/range-slider-options";
import {RangeSliderConfigurationUtil} from "./range-slider-configuration-util";
import {RangeSliderState} from "./range-slider-state";


type KeyboardEventListener = (event: KeyboardEvent) => void;

type MovementEventListener = (event: MouseEvent | TouchEvent) => void;

type PointerEventListener = (target: string, event: MouseEvent | TouchEvent) => void;

export enum RangeSliderElement {
    bar = ".irs-bar",
    from = ".irs-from",
    grid = ".irs-grid",
    line = ".irs-line",
    max = ".irs-max",
    min = ".irs-min",
    rangeSlider = ".irs", // AKA rs
    spanSingle = ".irs-single", // anciennement single
    to = ".irs-to",
    //single
    shadowSingle = ".shadow-single",
    singleHandle = ".irs-handle.single", //anciennement spanSingle
    //double
    shadowFrom = ".shadow-from",
    shadowTo = ".shadow-to",
    spanFrom = ".irs-handle.from",
    spanTo = ".irs-handle.to",
    //mask
    mask = ".irs-disable-mask"
}

export class RangeSliderDOM {
    private readonly body: HTMLBodyElement;
    private readonly input: HTMLInputElement;
    private readonly container: Element; // AKA slider
    private readonly window: Window;

    constructor(input: HTMLInputElement, configuration: IRangeSliderOptions<number>, count: number, state: RangeSliderState) {
        const body = document.querySelector("body");
        if (body === null) {
            throw Error("Body could not be found");
        }
        this.body = body;
        this.window = window;
        this.input = input;

        this.input.insertAdjacentHTML("beforebegin", Template.containerHtml(configuration.skin, count, configuration.extraClasses));
        this.input.readOnly = true;
        const container = this.input.previousElementSibling;
        if (container === null) {
            throw Error("Range slider could not be found")
        }
        this.container = container;

        this.buildRangeSlider(configuration);
        if (configuration.grid) {
            this.buildGrid(configuration, state);
        }

        this.displayMinMaxLabels(configuration.hideMinMax, state);
    }

    private buildRangeSlider(configuration: IRangeSliderOptions<number>) {
        this.container.innerHTML = Template.baseHtml;

        if (configuration.type === SliderType.single) {
            this.container.insertAdjacentHTML("beforeend", Template.singleHtml);
            this.getElement(RangeSliderElement.from).style.visibility = "hidden";
            this.getElement(RangeSliderElement.to).style.visibility = "hidden";
        } else {
            this.container.insertAdjacentHTML("beforeend", Template.doubleHtml);

            if (configuration.from > configuration.min && configuration.to === configuration.max) {
                this.getElement(RangeSliderElement.spanFrom).classList.add("type_last");
            } else if (configuration.to < configuration.max) {
                this.getElement(RangeSliderElement.spanTo).classList.add("type_last");
            }
        }

        if (configuration.hideFromTo) {
            this.getElement(RangeSliderElement.from).style.display = "none";
            this.getElement(RangeSliderElement.to).style.display = "none";
            this.getElement(RangeSliderElement.spanSingle).style.display = "none";
        }

        if (configuration.disable) {
            this.disable();
            this.input.disabled = true;
        } else {
            this.input.disabled = false;
            this.enable();
        }

        // block only if not disabled
        if (!configuration.disable) {
            if (configuration.block) {
                this.disable();
            } else {
                this.enable();
            }
        }

        if (configuration.dragInterval) {
            this.getElement(RangeSliderElement.bar).style.cursor = "ew-resize";
        }
    }

    private buildGrid(configuration: IRangeSliderOptions<number>, state: RangeSliderState) {
        const gridNum = state.getGridLabelsCount();
        let smallMax = 4,
            html = "",
            result: number | string;


        const widthHandleAsPercent = this.calcGridMargin(configuration);

        if (gridNum > 28) {
            smallMax = 0;
        } else if (gridNum > 14) {
            smallMax = 1;
        } else if (gridNum > 7) {
            smallMax = 2;
        } else if (gridNum > 4) {
            smallMax = 3;
        }

        const percentBetweenTwoLabels = RangeSliderConfigurationUtil.toFixed(100 / (gridNum - 1));

        for (let i = 0; i < gridNum; i++) {
            const localSmallMax = smallMax;

            const spaceForCurrentLabel = RangeSliderConfigurationUtil.toFixed(percentBetweenTwoLabels * i);

            if (spaceForCurrentLabel > 100) {
                throw Error(`Percentage value is superior to 100% ${percentBetweenTwoLabels}`)
            }

            const smallP = (spaceForCurrentLabel - (percentBetweenTwoLabels * (i - 1))) / (localSmallMax + 1);

            for (let z = 1; z <= localSmallMax; z++) {
                if (spaceForCurrentLabel === 0) {
                    break;
                }

                const smallW = RangeSliderConfigurationUtil.toFixed(spaceForCurrentLabel - (smallP * z));

                html += `<span class="irs-grid-pol small" style="left: ${smallW}%"></span>`;
            }

            html += `<span class="irs-grid-pol" style="left: ${spaceForCurrentLabel}%"></span>`;

            result = state.convertToValue(spaceForCurrentLabel);

            if (state.hasCustomValues()) {
                result = state.getValuePrettified(result);
            } else {
                result = state.prettify(result);
            }

            html += `<span class="irs-grid-text js-grid-text-${i}" style="left: ${spaceForCurrentLabel}%">${result}</span>`
        }

        this.getContainer().classList.toggle("irs-with-grid");
        this.getElement(RangeSliderElement.grid).innerHTML = html;
        this.calcGridLabels(gridNum, percentBetweenTwoLabels, configuration.forceEdges, RangeSliderConfigurationUtil.toFixed(widthHandleAsPercent / 2));
    }

    private calcGridMargin(configuration: IRangeSliderOptions<number>): number {
        if (!configuration.gridMargin) {
            return;
        }

        const rangeSliderWidth = RangeSliderDOM.outerWidth(this.getElement(RangeSliderElement.rangeSlider), false);
        if (rangeSliderWidth) {
            return;
        }

        const handleWidth = configuration.type === SliderType.single ?
            RangeSliderDOM.outerWidth(this.getElement(RangeSliderElement.singleHandle), false) :
            RangeSliderDOM.outerWidth(this.getElement(RangeSliderElement.spanFrom), false);

        const widthHandleAsPercent = (handleWidth / rangeSliderWidth) * 100

        const grid = this.getElement(RangeSliderElement.grid);
        grid.style.width = `${RangeSliderConfigurationUtil.toFixed(100 - widthHandleAsPercent)}%`;
        grid.style.left = `${RangeSliderConfigurationUtil.toFixed(widthHandleAsPercent / 2)}%`; //-0.1 en plus ?

        return widthHandleAsPercent;
    }

    private calcGridLabels(gridNum: number, percentBetweenTwoLabels: number, forceEdges: boolean, halfWidthHandleAsPercent: number): void {
        const start: number[] = [], finish: number[] = [],
            rangeSliderWidth = RangeSliderDOM.outerWidth(this.getElement(RangeSliderElement.rangeSlider), false);

        for (let i = 0; i < gridNum; i++) {
            let marginLeft;

            const label = this.getLabel(i);

            const labelWidth = RangeSliderDOM.outerWidth(label, false);
            const labelWidthPercent = RangeSliderConfigurationUtil.toFixed(labelWidth / rangeSliderWidth * 100);

            if (i === 0 && forceEdges && start[i] < -halfWidthHandleAsPercent) {
                start.push(-halfWidthHandleAsPercent);
                finish.push(RangeSliderConfigurationUtil.toFixed(start[i] + labelWidthPercent));
                marginLeft = halfWidthHandleAsPercent;
            } else if (i === gridNum - 1 && forceEdges && finish[i] > 100 + halfWidthHandleAsPercent) {
                finish.push(100 + halfWidthHandleAsPercent);
                start.push(RangeSliderConfigurationUtil.toFixed(finish[i] - labelWidthPercent));
                marginLeft = RangeSliderConfigurationUtil.toFixed(labelWidthPercent - halfWidthHandleAsPercent);
            } else {
                const halfLabelWidthPercent = RangeSliderConfigurationUtil.toFixed(labelWidthPercent / 2);
                start.push(RangeSliderConfigurationUtil.toFixed((percentBetweenTwoLabels * i) - halfLabelWidthPercent));
                finish.push(RangeSliderConfigurationUtil.toFixed(start[i] + labelWidthPercent));
                marginLeft = halfLabelWidthPercent;
            }
            if (marginLeft !== Number.POSITIVE_INFINITY) {
                label.style.marginLeft = `${-marginLeft}%`;
            }
        }

        this.calcGridCollision(2, start, finish);
        this.calcGridCollision(4, start, finish);
    }

    private calcGridCollision(step: number, start: number[], finish: number[]): void {
        for (let i = 0; i < start.length; i += step) {
            const nextIndex = i + step / 2;
            if (nextIndex >= start.length) {
                break;
            }

            const label = this.getLabel(nextIndex);

            if (finish[i] <= start[nextIndex]) {
                label.style.visibility = "visible";
            } else {
                label.style.visibility = "hidden";
            }
        }
    }

    public remove() {
        this.container.parentNode?.removeChild(this.container);
    }

    public getInput() {
        return this.input;
    }

    public getContainer() {
        return this.container;
    }

    public getElement(elementType: RangeSliderElement): HTMLSpanElement {
        const element = this.container.querySelector<HTMLSpanElement>(elementType);
        if (element === null) {
            throw Error(`Element with class "${elementType}" was not found`);
        }
        return element;
    }

    public getLabel(index: number): HTMLSpanElement {
        const grid = this.getElement(RangeSliderElement.grid);
        const label = grid.querySelector<HTMLSpanElement>(`.irs-grid-text.js-grid-text-${index}`);
        if (!label) {
            throw Error(`Label with given index "${index}" was not found`);
        }
        return label;
    }


    public addEventListener(type: SliderType, dragInterval: boolean, keyboard: boolean,
                            pointerClick: PointerEventListener, pointerDown: PointerEventListener, pointerFocus: { (): void },
                            pointerMove: MovementEventListener, pointerUp: MovementEventListener, key: KeyboardEventListener) {
        const line = this.getElement(RangeSliderElement.line),
            bar = this.getElement(RangeSliderElement.bar),
            spanSingle = this.getElement(RangeSliderElement.spanSingle);

        this.body.addEventListener("touchmove", (event: TouchEvent) => pointerMove(event));
        this.body.addEventListener("mousemove", (event: MouseEvent) => pointerMove(event));
        this.window.addEventListener("touchend", (event: TouchEvent) => pointerUp(event));
        this.window.addEventListener("mouseup", (event: MouseEvent) => pointerUp(event));
        line.addEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));
        line.addEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        line.addEventListener("focus", () => pointerFocus());

        if (dragInterval && type === SliderType.double) {
            bar.addEventListener("touchstart", (event: TouchEvent) => pointerDown("both", event));
            bar.addEventListener("mousedown", (event: MouseEvent) => pointerDown("both", event));
        } else {
            bar.addEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));
            bar.addEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        }

        if (type === SliderType.single) {
            const singleHandle = this.getElement(RangeSliderElement.singleHandle),
                shadowSingle = this.getElement(RangeSliderElement.shadowSingle);
            spanSingle.addEventListener("touchstart", (event: TouchEvent) => pointerDown("single", event));
            singleHandle.addEventListener("touchstart", (event: TouchEvent) => pointerDown("single", event));
            shadowSingle.addEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));

            spanSingle.addEventListener("mousedown", (event: MouseEvent) => pointerDown("single", event));
            singleHandle.addEventListener("mousedown", (event: MouseEvent) => pointerDown("single", event));
            shadowSingle.addEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        } else {
            spanSingle.addEventListener("touchstart", (event: TouchEvent) => pointerDown(null, event));
            spanSingle.addEventListener("mousedown", (event: MouseEvent) => pointerDown(null, event));

            const shadowFrom = this.getElement(RangeSliderElement.shadowFrom),
                shadowTo = this.getElement(RangeSliderElement.shadowTo),
                to = this.getElement(RangeSliderElement.to),
                from = this.getElement(RangeSliderElement.from),
                spanTo = this.getElement(RangeSliderElement.spanTo),
                spanFrom = this.getElement(RangeSliderElement.spanFrom);
            from.addEventListener("touchstart", (event: TouchEvent) => pointerDown("from", event));
            spanFrom.addEventListener("touchstart", (event: TouchEvent) => pointerDown("from", event));
            to.addEventListener("touchstart", (event: TouchEvent) => pointerDown("to", event));
            spanTo.addEventListener("touchstart", (event: TouchEvent) => pointerDown("to", event));
            shadowFrom.addEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));
            shadowTo.addEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));

            from.addEventListener("mousedown", (event: MouseEvent) => pointerDown("from", event));
            spanFrom.addEventListener("mousedown", (event: MouseEvent) => pointerDown("from", event));
            to.addEventListener("mousedown", (event: MouseEvent) => pointerDown("to", event));
            spanTo.addEventListener("mousedown", (event: MouseEvent) => pointerDown("to", event));
            shadowFrom.addEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
            shadowTo.addEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        }

        if (keyboard) {
            line.addEventListener("keydown", (event: KeyboardEvent) => {
                key(event)
            });
        }

        if (RangeSliderDOM.getIsOldIe()) {
            this.body.addEventListener("mouseup", (event: MouseEvent) => pointerUp(event));
            this.body.addEventListener("mouseleave", (event: MouseEvent) => pointerUp(event));
        }
    }

    public removeEventListener(type: SliderType, dragInterval: boolean, keyboard: boolean,
                               pointerClick: PointerEventListener, pointerDown: PointerEventListener, pointerFocus: { (): void },
                               pointerMove: MovementEventListener, pointerUp: MovementEventListener, key: KeyboardEventListener) {
        const line = this.getElement(RangeSliderElement.line),
            bar = this.getElement(RangeSliderElement.bar),
            spanSingle = this.getElement(RangeSliderElement.spanSingle);
        this.body.removeEventListener("touchmove", (event: TouchEvent) => pointerMove(event));
        this.body.removeEventListener("mousemove", (event: MouseEvent) => pointerMove(event));
        this.window.removeEventListener("touchend", (event: TouchEvent) => pointerUp(event));
        this.window.removeEventListener("mouseup", (event: MouseEvent) => pointerUp(event));
        line.removeEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));
        line.removeEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        line.removeEventListener("focus", () => pointerFocus());

        if (dragInterval && type === SliderType.double) {
            bar.removeEventListener("touchstart", (event: TouchEvent) => pointerDown("both", event));
            bar.removeEventListener("mousedown", (event: MouseEvent) => pointerDown("both", event));
        } else {
            bar.removeEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));
            bar.removeEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        }

        if (type === SliderType.single) {
            const singleHandle = this.getElement(RangeSliderElement.singleHandle),
                shadowSingle = this.getElement(RangeSliderElement.shadowSingle);
            spanSingle.removeEventListener("touchstart", (event: TouchEvent) => pointerDown("single", event));
            singleHandle.removeEventListener("touchstart", (event: TouchEvent) => pointerDown("single", event));
            shadowSingle.removeEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));

            spanSingle.removeEventListener("mousedown", (event: MouseEvent) => pointerDown("single", event));
            singleHandle.removeEventListener("mousedown", (event: MouseEvent) => pointerDown("single", event));
            shadowSingle.removeEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        } else {
            spanSingle.removeEventListener("touchstart", (event: TouchEvent) => pointerDown(null, event));
            spanSingle.removeEventListener("mousedown", (event: MouseEvent) => pointerDown(null, event));

            const shadowFrom = this.getElement(RangeSliderElement.shadowFrom),
                shadowTo = this.getElement(RangeSliderElement.shadowTo),
                to = this.getElement(RangeSliderElement.to),
                from = this.getElement(RangeSliderElement.from),
                spanTo = this.getElement(RangeSliderElement.spanTo),
                spanFrom = this.getElement(RangeSliderElement.spanFrom);

            from.removeEventListener("touchstart", (event: TouchEvent) => pointerDown("from", event));
            spanFrom.removeEventListener("touchstart", (event: TouchEvent) => pointerDown("from", event));
            to.removeEventListener("touchstart", (event: TouchEvent) => pointerDown("to", event));
            spanTo.removeEventListener("touchstart", (event: TouchEvent) => pointerDown("to", event));
            shadowFrom.removeEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));
            shadowTo.removeEventListener("touchstart", (event: TouchEvent) => pointerClick("click", event));

            from.removeEventListener("mousedown", (event: MouseEvent) => pointerDown("from", event));
            spanFrom.removeEventListener("mousedown", (event: MouseEvent) => pointerDown("from", event));
            to.removeEventListener("mousedown", (event: MouseEvent) => pointerDown("to", event));
            spanTo.removeEventListener("mousedown", (event: MouseEvent) => pointerDown("to", event));
            shadowFrom.removeEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
            shadowTo.removeEventListener("mousedown", (event: MouseEvent) => pointerClick("click", event));
        }

        if (keyboard) {
            line.removeEventListener("keydown", (event: KeyboardEvent) => key(event));
        }

        if (RangeSliderDOM.getIsOldIe()) {
            this.body.removeEventListener("mouseup", (event: MouseEvent) => pointerUp(event));
            this.body.removeEventListener("mouseleave", (event: MouseEvent) => pointerUp(event));
        }
    }

    public removeHoverState() {
        const element = this.container.querySelector(".state_hover");
        if (element) {
            element.classList.remove("state_hover");
        }
    }

    public contains(element: Element): boolean {
        return this.container.contains(element);
    }

    private disable() {
        this.container.innerHTML = Template.disableHtml;
        this.container.classList.add("irs-disabled");
    }

    private enable(): void {
        try {
            const mask = this.getElement(RangeSliderElement.mask);
            if (mask) {
                this.container.removeChild(mask);
            }
        } catch (error) {
            // Rien à désactiver
        }
        this.container.classList.remove("irs-disabled");
    }

    /*private key(event: KeyboardEvent) {
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
            return;
        }

        switch (e.code) {
            case "KeyW": // W
            case "KeyA": // A
            case "ArrowDown": // DOWN
            case "ArrowLeft": // LEFT
                e.preventDefault();
                this.moveByKey(false);
                break;

            case "KeyS": // S
            case "KeyD": // D
            case "ArrowUp": // UP
            case "ArrowRight": // RIGHT
                e.preventDefault();
                this.moveByKey(true);
                break;
        }
    }*/

    private static getIsOldIe(): boolean {
        const userAgent = navigator.userAgent,
            msieRegExp = /msie\s\d+/i;
        if (userAgent.search(msieRegExp) === -1) {
            return false;
        }
        const matches = userAgent.match(msieRegExp);
        if (!matches) {
            return false;
        }
        const version = matches[0].split(" ")[1];
        if (parseFloat(version) >= 9) {
            return false;
        }
        const html = document.querySelector("html");
        const classToAdd = "lt-ie9";
        if (html && !html.classList.contains(classToAdd)) {
            html.classList.add(classToAdd);
        }
        return true;
    }

    private static outerWidth(el: HTMLElement, includeMargin = false): number {
        let width = el.offsetWidth;
        if (includeMargin) {
            const style = getComputedStyle(el);
            width += parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10);
        }
        return width;
    }

    private displayMinMaxLabels(isHidden: boolean, state: RangeSliderState) {
        if (isHidden) {
            this.getElement(RangeSliderElement.min).style.display = "none";
            this.getElement(RangeSliderElement.max).style.display = "none";
            return;
        }

        this.getElement(RangeSliderElement.min).innerHTML = state.decorateMinValue();
        this.getElement(RangeSliderElement.max).innerHTML = state.decorateMaxValue();
    }
}