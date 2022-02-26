import {EventType, RangeSliderElement, SliderType, TargetType} from "../enums";
import {RangeSliderTemplate} from "./range-slider-template";
import {IRangeSliderOptions} from "../interfaces/range-slider-options";
import {RangeSliderState} from "./range-slider-state";
import {EventBus} from "./range-slider-event-bus";
import {RangeSliderUtil} from "./range-slider-util";

export class RangeSliderDOM {
    private static get body(): HTMLBodyElement {
        const body = document.querySelector("body");
        if (body === null) {
            throw Error("Body could not be found");
        }
        return body;
    }

    private readonly _input: HTMLInputElement;
    private readonly _container: Element;
    private readonly eventBus: EventBus;
    private _isPointerDragging = false;

    private readonly type: SliderType;
    private readonly forceEdges: boolean;
    private readonly gridMargin: boolean;

    private readonly _pointerMoveEventListener = (event: TouchEvent | MouseEvent) => this.pointerMove(event);
    private readonly _pointerUpEventListener = (event: TouchEvent | MouseEvent) => this.pointerUp(event);
    private readonly _pointerClick = (event: TouchEvent | MouseEvent) => this.pointerClick(event);
    private readonly _pointerDown = (event: TouchEvent | MouseEvent) => this.pointerDown(event);
    private readonly _keyDown = (event: KeyboardEvent) => this.keyDown(event);

    constructor(input: HTMLInputElement, configuration: IRangeSliderOptions<number>, count: number, state: RangeSliderState, eventBus: EventBus) {
        this._input = input;

        this._input.insertAdjacentHTML("beforebegin", RangeSliderTemplate.containerHtml(configuration.skin, count, configuration.extraClasses));
        this._input.readOnly = true;
        const container = this._input.previousElementSibling;
        if (container === null) {
            throw Error("Range slider could not be found")
        }
        this._container = container;

        this.forceEdges = configuration.forceEdges;
        this.gridMargin = configuration.gridMargin;
        this.type = configuration.type;

        this.buildRangeSlider(configuration);
        if (configuration.grid) {
            this.buildGrid(state);
            this.updateGrid(state.getGridLabelsCount());
        }

        this.displayMinMaxLabels(configuration.hideMinMax, state);

        this.displayShadow(state, configuration);

        this.eventBus = eventBus;
    }

    private buildRangeSlider(configuration: IRangeSliderOptions<number>) {
        this._container.innerHTML = RangeSliderTemplate.baseHtml;

        if (this.type === SliderType.single) {
            this._container.insertAdjacentHTML("beforeend", RangeSliderTemplate.singleHtml);
            this.getElement(RangeSliderElement.from).style.visibility = "hidden";
            this.getElement(RangeSliderElement.to).style.visibility = "hidden";
        } else {
            this._container.insertAdjacentHTML("beforeend", RangeSliderTemplate.doubleHtml);

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
            this._input.disabled = true;
        } else {
            this._input.disabled = false;
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

    private buildGrid(state: RangeSliderState) {
        const gridLabelsCount = state.getGridLabelsCount();
        const html = [];

        const noLabelCount = RangeSliderDOM.getNoLabelCount(gridLabelsCount);

        const percentBetweenTwoLabels = RangeSliderUtil.toFixed(100 / (gridLabelsCount - 1));

        for (let i = 0; i < gridLabelsCount; i++) {
            const spaceForCurrentLabel = RangeSliderUtil.toFixed(percentBetweenTwoLabels * i);

            if (spaceForCurrentLabel > 100) {
                throw Error(`Percentage value is superior to 100% ${percentBetweenTwoLabels}`)
            }

            const smallP = (spaceForCurrentLabel - (percentBetweenTwoLabels * (i - 1))) / (noLabelCount + 1);

            if (!state.hasCustomValues()) {
                for (let z = 1; z <= noLabelCount; z++) {
                    if (spaceForCurrentLabel === 0) {
                        break;
                    }

                    const smallW = RangeSliderUtil.toFixed(spaceForCurrentLabel - (smallP * z));

                    html.push(`<span class="irs-grid-pol small" style="left: ${smallW}%"></span>`);
                }
            }
            html.push(`<span class="irs-grid-pol" style="left: ${spaceForCurrentLabel}%"></span>`);

            let result: number | string = state.convertToValue(spaceForCurrentLabel);

            if (state.hasCustomValues()) {
                result = state.getValuePrettified(result);
            } else {
                result = state.prettify(result);
            }

            html.push(`<span class="irs-grid-text js-grid-text-${i}" style="left: ${spaceForCurrentLabel}%">${result}</span>`);
        }

        this.container.classList.toggle("irs-with-grid");
        this.getElement(RangeSliderElement.grid).innerHTML = html.join("");
    }

    public updateGrid(gridLabelsCount: number) {
        const widthHandleAsPercent = this.getGridMargin();
        this.updateGridLabels(gridLabelsCount, RangeSliderUtil.toFixed(widthHandleAsPercent / 2));
    }

    private getGridMargin(): number {
        if (!this.gridMargin) {
            return;
        }

        const rangeSliderWidth = this.getElement(RangeSliderElement.rangeSlider).offsetWidth;
        if (!rangeSliderWidth) {
            return;
        }

        const handleWidth = this.type === SliderType.single ?
            this.getElement(RangeSliderElement.singleHandle).offsetWidth :
            this.getElement(RangeSliderElement.spanFrom).offsetWidth;

        const widthHandleAsPercent = (handleWidth / rangeSliderWidth) * 100

        const grid = this.getElement(RangeSliderElement.grid);
        grid.style.width = `${RangeSliderUtil.toFixed(100 - widthHandleAsPercent)}%`;
        grid.style.left = `${RangeSliderUtil.toFixed(widthHandleAsPercent / 2)}%`; //-0.1 en plus ?

        return widthHandleAsPercent;
    }

    private updateGridLabels(gridLabelsCount: number, halfWidthHandleAsPercent: number): void {
        const start: number[] = [], finish: number[] = [],
            percentBetweenTwoLabels = RangeSliderUtil.toFixed(100 / (gridLabelsCount - 1));

        for (let i = 0; i < gridLabelsCount; i++) {
            let marginLeft;

            const label = this.getLabel(i);

            const labelWidth = label.offsetWidth;
            const labelWidthPercent = this.getPercent(labelWidth);

            if (i === 0 && this.forceEdges && start[i] < -halfWidthHandleAsPercent) {
                start.push(-halfWidthHandleAsPercent);
                finish.push(RangeSliderUtil.toFixed(start[i] + labelWidthPercent));
                marginLeft = halfWidthHandleAsPercent;
            } else if (i === gridLabelsCount - 1 && this.forceEdges && finish[i] > 100 + halfWidthHandleAsPercent) {
                finish.push(100 + halfWidthHandleAsPercent);
                start.push(RangeSliderUtil.toFixed(finish[i] - labelWidthPercent));
                marginLeft = RangeSliderUtil.toFixed(labelWidthPercent - halfWidthHandleAsPercent);
            } else {
                const halfLabelWidthPercent = RangeSliderUtil.toFixed(labelWidthPercent / 2);
                start.push(RangeSliderUtil.toFixed((percentBetweenTwoLabels * i) - halfLabelWidthPercent));
                finish.push(RangeSliderUtil.toFixed(start[i] + labelWidthPercent));
                marginLeft = halfLabelWidthPercent;
            }
            if (marginLeft !== Number.POSITIVE_INFINITY) {
                label.style.marginLeft = `${-marginLeft}%`;
            }
        }

        this.updateGridLabelsVisibility(2, start, finish);
        this.updateGridLabelsVisibility(4, start, finish);
    }

    private updateGridLabelsVisibility(step: number, start: number[], finish: number[]): void {
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
        this._container.parentNode?.removeChild(this._container);
    }

    public get input() {
        return this._input;
    }

    public get container() {
        return this._container;
    }

    public get isDragging() {
        return this._isPointerDragging;
    }

    public getElement(elementType: RangeSliderElement): HTMLSpanElement {
        const element = this._container.querySelector<HTMLSpanElement>(elementType);
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
                            pointerFocus: { (): void }) {
        const line = this.getElement(RangeSliderElement.line),
            bar = this.getElement(RangeSliderElement.bar),
            spanSingle = this.getElement(RangeSliderElement.spanSingle);

        line.addEventListener("touchstart", this._pointerClick);
        line.addEventListener("mousedown", this._pointerClick);
        line.addEventListener("focus", pointerFocus);

        if (dragInterval && type === SliderType.double) {
            bar.addEventListener("touchstart", this._pointerDown);
            bar.addEventListener("mousedown", this._pointerDown);
        } else {
            bar.addEventListener("touchstart", this._pointerClick);
            bar.addEventListener("mousedown", this._pointerClick);
        }

        if (type === SliderType.single) {
            const singleHandle = this.getElement(RangeSliderElement.singleHandle),
                shadowSingle = this.getElement(RangeSliderElement.shadowSingle);
            spanSingle.addEventListener("touchstart", this._pointerDown);
            singleHandle.addEventListener("touchstart", this._pointerDown);
            shadowSingle.addEventListener("touchstart", this._pointerClick);

            spanSingle.addEventListener("mousedown", this._pointerDown);
            singleHandle.addEventListener("mousedown", this._pointerDown);
            shadowSingle.addEventListener("mousedown", this._pointerClick);
        } else {
            spanSingle.addEventListener("touchstart", this._pointerDown);
            spanSingle.addEventListener("mousedown", this._pointerDown);

            const shadowFrom = this.getElement(RangeSliderElement.shadowFrom),
                shadowTo = this.getElement(RangeSliderElement.shadowTo),
                to = this.getElement(RangeSliderElement.to),
                from = this.getElement(RangeSliderElement.from),
                spanTo = this.getElement(RangeSliderElement.spanTo),
                spanFrom = this.getElement(RangeSliderElement.spanFrom);
            from.addEventListener("touchstart", this._pointerDown);
            spanFrom.addEventListener("touchstart", this._pointerDown);
            to.addEventListener("touchstart", this._pointerDown);
            spanTo.addEventListener("touchstart", this._pointerDown);
            shadowFrom.addEventListener("touchstart", this._pointerClick);
            shadowTo.addEventListener("touchstart", this._pointerClick);

            from.addEventListener("mousedown", this._pointerDown);
            spanFrom.addEventListener("mousedown", this._pointerDown);
            to.addEventListener("mousedown", this._pointerDown);
            spanTo.addEventListener("mousedown", this._pointerDown);
            shadowFrom.addEventListener("mousedown", this._pointerClick);
            shadowTo.addEventListener("mousedown", this._pointerClick);
        }

        if (keyboard) {
            line.addEventListener("keydown", this._keyDown);
        }
    }

    public removeEventListener(type: SliderType, dragInterval: boolean, keyboard: boolean,
                               pointerFocus: { (): void }) {
        const line = this.getElement(RangeSliderElement.line),
            bar = this.getElement(RangeSliderElement.bar),
            spanSingle = this.getElement(RangeSliderElement.spanSingle);

        line.removeEventListener("touchstart", this._pointerClick);
        line.removeEventListener("mousedown", this._pointerClick);
        line.removeEventListener("focus", pointerFocus);

        if (dragInterval && type === SliderType.double) {
            bar.removeEventListener("touchstart", this._pointerDown);
            bar.removeEventListener("mousedown", this._pointerDown);
        } else {
            bar.removeEventListener("touchstart", this._pointerClick);
            bar.removeEventListener("mousedown", this._pointerClick);
        }

        if (type === SliderType.single) {
            const singleHandle = this.getElement(RangeSliderElement.singleHandle),
                shadowSingle = this.getElement(RangeSliderElement.shadowSingle);
            spanSingle.removeEventListener("touchstart", this._pointerDown);
            singleHandle.removeEventListener("touchstart", this._pointerDown);
            shadowSingle.removeEventListener("touchstart", this._pointerClick);

            spanSingle.removeEventListener("mousedown", this._pointerDown);
            singleHandle.removeEventListener("mousedown", this._pointerDown);
            shadowSingle.removeEventListener("mousedown", this._pointerClick);
        } else {
            spanSingle.removeEventListener("touchstart", this._pointerDown);
            spanSingle.removeEventListener("mousedown", this._pointerDown);

            const shadowFrom = this.getElement(RangeSliderElement.shadowFrom),
                shadowTo = this.getElement(RangeSliderElement.shadowTo),
                to = this.getElement(RangeSliderElement.to),
                from = this.getElement(RangeSliderElement.from),
                spanTo = this.getElement(RangeSliderElement.spanTo),
                spanFrom = this.getElement(RangeSliderElement.spanFrom);

            from.removeEventListener("touchstart", this._pointerDown);
            spanFrom.removeEventListener("touchstart", this._pointerDown);
            to.removeEventListener("touchstart", this._pointerDown);
            spanTo.removeEventListener("touchstart", this._pointerDown);
            shadowFrom.removeEventListener("touchstart", this._pointerClick);
            shadowTo.removeEventListener("touchstart", this._pointerClick);

            from.removeEventListener("mousedown", this._pointerDown);
            spanFrom.removeEventListener("mousedown", this._pointerDown);
            to.removeEventListener("mousedown", this._pointerDown);
            spanTo.removeEventListener("mousedown", this._pointerDown);
            shadowFrom.removeEventListener("mousedown", this._pointerClick);
            shadowTo.removeEventListener("mousedown", this._pointerClick);
        }

        if (keyboard) {
            line.removeEventListener("keydown", this._keyDown);
        }
    }

    public removeHoverState() {
        const element = this._container.querySelector(".state_hover");
        if (element) {
            element.classList.remove("state_hover");
        }
    }

    public contains(element: Element): boolean {
        return this._container.contains(element);
    }

    public getHandleWidthAsPercent(): number {
        const handleWidth = this.type === SliderType.single ?
                this.getElement(RangeSliderElement.singleHandle).offsetWidth :
                this.getElement(RangeSliderElement.spanFrom).offsetWidth;

        return this.getPercent(handleWidth);
    }

    public getPercent(value: number): number {
        const rangeSliderWidth = this.getElement(RangeSliderElement.rangeSlider).offsetWidth;
        return RangeSliderUtil.toFixed(value / rangeSliderWidth * 100);
    }

    public constrainValue(left: number, width: number): number {
        if(this.forceEdges) {
            if (left < 0) {
                left = 0;
            } else if (left > 100 - width) {
                left = 100 - width;
            }
        }
        return RangeSliderUtil.toFixed(left);
    }

    private disable() {
        this._container.innerHTML = RangeSliderTemplate.disableHtml;
        this._container.classList.add("irs-disabled");
    }

    private enable(): void {
        try {
            const mask = this.getElement(RangeSliderElement.mask);
            if (mask) {
                this._container.removeChild(mask);
            }
        } catch (error) {
            // Rien à désactiver
        }
        this._container.classList.remove("irs-disabled");
    }

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

    private displayMinMaxLabels(isHidden: boolean, state: RangeSliderState) {
        if (isHidden) {
            this.getElement(RangeSliderElement.min).style.display = "none";
            this.getElement(RangeSliderElement.max).style.display = "none";
            return;
        }

        this.getElement(RangeSliderElement.min).innerHTML = state.decorateMinValue();
        this.getElement(RangeSliderElement.max).innerHTML = state.decorateMaxValue();
    }

    private displayShadow(state: RangeSliderState, configuration: IRangeSliderOptions<number>): void {
        const isFromMin = typeof configuration.fromMin === "number" && !isNaN(configuration.fromMin),
            isFromMax = typeof configuration.fromMax === "number" && !isNaN(configuration.fromMax),
            isToMin = typeof configuration.toMin === "number" && !isNaN(configuration.toMin),
            isToMax = typeof configuration.toMax === "number" && !isNaN(configuration.toMax),
            handleWidthAsPercent = this.getHandleWidthAsPercent();

        let fromMin: number,
            fromMax: number;

        fromMin = state.convertToPercent(isFromMin ? configuration.fromMin : configuration.min);
        fromMax = state.convertToPercent(isFromMax ? configuration.fromMax : configuration.max) - fromMin;
        fromMin = RangeSliderUtil.toFixed(fromMin - handleWidthAsPercent / 100 * fromMin);
        fromMax = RangeSliderUtil.toFixed(fromMax - handleWidthAsPercent / 100 * fromMax);
        fromMin = fromMin + (handleWidthAsPercent / 2);

        if (this.type === SliderType.single) {
            const shadowSingle = this.getElement(RangeSliderElement.shadowSingle);
            if (configuration.fromShadow && (isFromMin || isFromMax)) {
                shadowSingle.style.display = "block";
                shadowSingle.style.left = fromMin.toString(10) + "%";
                shadowSingle.style.width = fromMax.toString(10) + "%";
            } else {
                shadowSingle.style.display = "none";
            }
        } else {
            const shadowFrom = this.getElement(RangeSliderElement.shadowFrom);

            if (configuration.fromShadow && (isFromMin || isFromMax)) {
                shadowFrom.style.display = "block";
                shadowFrom.style.left = fromMin.toString(10) + "%";
                shadowFrom.style.width = fromMax.toString(10) + "%";
            } else {
                shadowFrom.style.display = "none";
            }

            const shadowTo = this.getElement(RangeSliderElement.shadowTo);

            if (configuration.toShadow && (isToMin || isToMax)) {
                let toMin: number,
                    toMax: number;

                toMin = state.convertToPercent(isToMin ? configuration.toMin : configuration.min);
                toMax = state.convertToPercent(isToMax ? configuration.toMax : configuration.max) - toMin;
                toMin = RangeSliderUtil.toFixed(toMin - handleWidthAsPercent / 100 * toMin);
                toMax = RangeSliderUtil.toFixed(toMax - handleWidthAsPercent / 100 * toMax);
                toMin = toMin + (handleWidthAsPercent / 2);

                shadowTo.style.display = "block";
                shadowTo.style.left = toMin.toString(10) + "%";
                shadowTo.style.width = toMax.toString(10) + "%";
            } else {
                shadowTo.style.display = "none";
            }
        }
    }

    private static getNoLabelCount(gridLabelsCount: number): number {
        if (gridLabelsCount > 29) {
            return 0;
        } else if (gridLabelsCount > 15) {
            return 1;
        } else if (gridLabelsCount > 8) {
            return 2;
        } else if (gridLabelsCount > 5) {
            return 3;
        }
        return 4;
    }

    private pointerMove(event: MouseEvent | TouchEvent) {
        event.stopPropagation();
        if (!this._isPointerDragging) {
            return;
        }

        const x = RangeSliderDOM.getX(event);

        this.eventBus.emit(EventType.move, {x});
    }

    private pointerDown(event: MouseEvent | TouchEvent) {
        const target = this.getTargetFromElement(event.target as Element);
        event.stopPropagation();
        if (RangeSliderDOM.isRightClick(event)) {
            return;
        }
        this._isPointerDragging = true;
        this.addDraggingEventListeners();

        this.eventBus.emit(EventType.down, {target, x: RangeSliderDOM.getX(event)});
    }

    private static isRightClick(event: MouseEvent | TouchEvent): boolean {
        return event instanceof MouseEvent && event.button === 2;
    }

    private pointerUp(event: MouseEvent | TouchEvent) {
        event.stopPropagation();
        if (!this._isPointerDragging) {
            return;
        }

        this._isPointerDragging = false;
        this.removeDraggingEventListeners();

        this.getElement(RangeSliderElement.line).focus();

        this.eventBus.emit(EventType.up, {eventTarget: event.target});
    }

    private pointerClick(event: MouseEvent | TouchEvent): void {
        this.getElement(RangeSliderElement.line).focus();
        event.stopPropagation();
        if (RangeSliderDOM.isRightClick(event)) {
            return;
        }
        this.eventBus.emit(EventType.click, {target: TargetType.click, x: RangeSliderDOM.getX(event)});
    }

    private keyDown(event: KeyboardEvent): void {
        if (event.altKey || event.ctrlKey || event.shiftKey || event.metaKey) {
            return;
        }

        switch (event.code) {
            case "KeyW": // W
            case "KeyA": // A
            case "ArrowDown": // DOWN
            case "ArrowLeft": // LEFT
            case "KeyS": // S
            case "KeyD": // D
            case "ArrowUp": // UP
            case "ArrowRight": // RIGHT
                event.stopPropagation();
                this.eventBus.emit(EventType.keyDown, {keyCode: event.code});
                break;
        }
    }

    private addDraggingEventListeners() {
        const body = RangeSliderDOM.body;
        body.addEventListener("touchmove", this._pointerMoveEventListener);
        body.addEventListener("mousemove", this._pointerMoveEventListener);
        window.addEventListener("touchend", this._pointerUpEventListener);
        window.addEventListener("mouseup", this._pointerUpEventListener);

        if (RangeSliderDOM.getIsOldIe()) {
            body.addEventListener("mouseup", (event: MouseEvent) => this._pointerUpEventListener(event));
            body.addEventListener("mouseleave", (event: MouseEvent) => this._pointerUpEventListener(event));
        }
    }

    private removeDraggingEventListeners() {
        const body = RangeSliderDOM.body;
        body.removeEventListener("touchmove", this._pointerMoveEventListener);
        body.removeEventListener("mousemove", this._pointerMoveEventListener);
        window.removeEventListener("touchend", this._pointerUpEventListener);
        window.removeEventListener("mouseup", this._pointerUpEventListener);

        if (RangeSliderDOM.getIsOldIe()) {
            body.removeEventListener("mouseup", (event: MouseEvent) => this._pointerUpEventListener(event));
            body.removeEventListener("mouseleave", (event: MouseEvent) => this._pointerUpEventListener(event));
        }
    }

    private static getX(e: MouseEvent | TouchEvent): number {
        return e instanceof MouseEvent ? e.pageX : e.touches && e.touches[0].pageX;
    }

    private getTargetFromElement(element: Element): TargetType {
        if (this.getElement(RangeSliderElement.bar).contains(element)) {
            return TargetType.both;
        }

        if (this.type === SliderType.single) {
            if (this.getElement(RangeSliderElement.singleHandle).contains(element)) {
                return TargetType.single;
            }

            if (this.getElement(RangeSliderElement.spanSingle).contains(element)) {
                return TargetType.single;
            }
        } else {
            if (this.getElement(RangeSliderElement.spanSingle).contains(element)) {
                return null;
            }

            if (this.getElement(RangeSliderElement.from).contains(element) || this.getElement(RangeSliderElement.spanFrom).contains(element)) {
                return TargetType.from;
            }

            if (this.getElement(RangeSliderElement.to).contains(element) || this.getElement(RangeSliderElement.spanTo).contains(element)) {
                return TargetType.to;
            }
        }
        throw Error(`Can't find target from element class "${element.className}"`);
    }
}