import {RangeSliderDOM, RangeSliderElement} from "./range-slider-dom";
import {RangeSliderConfigurationUtil} from "./range-slider-configuration-util";
import {IRangeSliderOptions} from "../interfaces/range-slider-options";
import {RangeSliderEvent} from "./range-slider-event";
import {SliderType} from "../enums";
import {RangeSliderState} from "./range-slider-state";

export interface IRangeSlider {
    destroy(): void;

    reset(): void;

    update(option: Partial<IRangeSliderOptions<number | string>>): void;
}

export class RangeSlider implements IRangeSlider {
    private static currentPluginCount = 0;

    private readonly domElement: RangeSliderDOM;
    private readonly pluginCount: number;

    private input?: HTMLInputElement;
    private currentPlugin = 0;
    private calcCount = 0;
    private updateTimeoutId?: number;
    private previousResultFrom = 0;
    private previousResultTo = 0;
    private previousMinInterval?: number;
    private rafId?: number;
    private dragging = false;
    private forceRedraw = false;
    private noDiapason = false;
    private hasTabIndex = true;
    private isKey = false;
    private isUpdate = false;
    private isStart = true;
    private isFinish = false;
    private isActive = false;
    private isResize = false;
    private isClick = false;
    private configuration: IRangeSliderOptions<number>;
    private state: RangeSliderState;
    private labels = {
        width: {
            min: 0,
            max: 0,
            from: 0,
            to: 0,
            single: 0
        },
        percents: {
            min: 0,
            max: 0,
            fromFake: 0,
            fromLeft: 0,
            toFake: 0,
            toLeft: 0,
            singleFake: 0,
            singleLeft: 0
        }
    };
    private coords = {
        x: {
            gap: 0,
            pointer: 0
        },
        width: {
            rs: 0,
            oldRs: 0,
            handle: 0
        },
        percents: {
            gap: 0,
            gapLeft: 0,
            gapRight: 0,
            step: 0,
            pointer: 0,
            handle: 0,
            singleFake: 0,
            singleReal: 0,
            fromFake: 0,
            fromReal: 0,
            toFake: 0,
            toReal: 0,
            barX: 0,
            barW: 0
        },
        big: [],
        bigNum: 0,
        bigP: [] as number[],
        bigX: [] as number[],
        bigW: [] as number[],
        gridGap: 0
    };
    private updateCheck?: { from: number; to: number };
    private target?: string;

    private static getCurrentPluginCount() {
        return RangeSlider.currentPluginCount++;
    }

    // =================================================================================================================
    // Core
    // =================================================================================================================

    constructor(inputElement: HTMLInputElement, options: Partial<IRangeSliderOptions<number | string>>) {
        if (!inputElement) {
            throw Error("Given input element does not exist");
        }
        this.input = inputElement;
        this.pluginCount = RangeSlider.getCurrentPluginCount();

        options = options || {};

        // check if base element is input
        if (inputElement.nodeName !== "INPUT") {
            throw Error("Base element should be <input>!");
        }

        // merge configurations
        this.configuration = RangeSliderConfigurationUtil.initializeConfiguration(options, inputElement.value);

        this.state = new RangeSliderState(this.configuration);

        this.domElement = new RangeSliderDOM(inputElement, this.configuration, this.pluginCount, this.state);

        this.domElement.addEventListener(this.configuration.type, this.configuration.dragInterval, this.configuration.keyboard,
            (target, event) => this.pointerClick(target, event), (target, event) => this.pointerDown(target, event), () => this.pointerFocus(),
            event => this.pointerMove(event), event => this.pointerUp(event), event => this.key(event));

        //todo create coords according to configuration (toReal must be set to "to" value, from as well)

        // validate config, to be sure that all data types are correct
        this.updateCheck = undefined;

        this.init();
    }

    /**
     * Starts or updates the plugin instance
     */
    private init(isUpdate?: boolean): void {
        this.noDiapason = false;
        this.coords.percents.step = this.convertToPercent(this.configuration.step, true);
        this.target = "base";

        this.toggleInput();
        // this.append();
        // this.setMinMax();

        if (isUpdate) {
            this.forceRedraw = true;
            this.calc(true);
            this.callOnUpdate();
        } else {
            this.forceRedraw = true;
            this.calc(true);
            this.callOnStart();
        }

        this.updateScene();
    }

    /**
     * Determine which handles was clicked last
     * and which handler should have hover effect
     */
    private changeLevel(target: string): void {
        switch (target) {
            case "single":
                this.coords.percents.gap = RangeSliderConfigurationUtil.toFixed(this.coords.percents.pointer - this.coords.percents.singleFake);
                this.domElement.getElement(RangeSliderElement.singleHandle).classList.add("state_hover");
                break;
            case "from":
                this.coords.percents.gap = RangeSliderConfigurationUtil.toFixed(this.coords.percents.pointer - this.coords.percents.fromFake);
                this.domElement.getElement(RangeSliderElement.spanFrom).classList.add("state_hover");
                this.domElement.getElement(RangeSliderElement.spanFrom).classList.add("type_last");
                this.domElement.getElement(RangeSliderElement.spanTo).classList.remove("type_last");
                break;
            case "to":
                this.coords.percents.gap = RangeSliderConfigurationUtil.toFixed(this.coords.percents.pointer - this.coords.percents.toFake);
                this.domElement.getElement(RangeSliderElement.spanTo).classList.add("state_hover");
                this.domElement.getElement(RangeSliderElement.spanTo).classList.add("type_last");
                this.domElement.getElement(RangeSliderElement.spanFrom).classList.remove("type_last");
                break;
            case "both":
                this.coords.percents.gapLeft = RangeSliderConfigurationUtil.toFixed(this.coords.percents.pointer - this.coords.percents.fromFake);
                this.coords.percents.gapRight = RangeSliderConfigurationUtil.toFixed(this.coords.percents.toFake - this.coords.percents.pointer);
                this.domElement.getElement(RangeSliderElement.spanTo).classList.remove("type_last");
                this.domElement.getElement(RangeSliderElement.spanFrom).classList.remove("type_last");
                break;
        }
    }

    /**
     * Remove slider instance
     * and unbind all events
     */
    private remove(): void {
        this.domElement.remove();

        this.domElement.removeEventListener(this.configuration.type, this.configuration.dragInterval, this.configuration.keyboard,
            (target, event) => this.pointerClick(target, event), (target, event) => this.pointerDown(target, event), () => this.pointerFocus(),
            event => this.pointerMove(event), event => this.pointerUp(event), event => this.key(event));

        this.coords.big = [];
        this.coords.bigW = [];
        this.coords.bigP = [];
        this.coords.bigX = [];

        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = undefined;
        }
    }

    /**
     * Focus with tabIndex
     */
    private pointerFocus(): void {
        if (!this.target) {
            let handle: HTMLSpanElement;

            if (this.configuration.type === "single") {
                handle = this.domElement.getElement(RangeSliderElement.spanSingle);
            } else {
                handle = this.domElement.getElement(RangeSliderElement.from);
            }

            if (!handle) {
                throw Error("Handle is not defined");
            }
            let x = RangeSlider.getOffset(handle).left;
            x += handle.offsetWidth / 2 - 1;

            this.updateXPosition("single", x);
        }
    }

    private static getOffset(element: Element): { top: number; left: number } {
        const rect = element.getBoundingClientRect();

        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX
        };
    }

    /**
     * Mousemove or touchmove
     * only for handlers
     */
    private pointerMove(e: MouseEvent | TouchEvent) {
        if (!this.dragging) {
            return;
        }

        const x = RangeSlider.getX(e);
        this.coords.x.pointer = x - this.coords.x.gap;

        this.calc();
    }

    /**
     * Mouseup or touchend
     * only for handlers
     */
    private pointerUp(e: MouseEvent | TouchEvent): void {
        if (this.currentPlugin !== this.pluginCount) {
            return;
        }

        if (this.isActive) {
            this.isActive = false;
        } else {
            return;
        }

        this.domElement.removeHoverState();

        this.forceRedraw = true;

        this.updateScene();
        this.restoreOriginalMinInterval();

        // callbacks call
        if (this.domElement.contains(e.target as Element) || this.dragging) {
            this.callOnFinish();
        }

        this.dragging = false;
    }

    /**
     * Mousedown or touchstart
     * only for handlers
     */
    private pointerDown(target: string | null, e: MouseEvent | TouchEvent): void {
        e.preventDefault();
        const x = RangeSlider.getX(e);
        if (e instanceof MouseEvent && e.button === 2) {
            return;
        }

        if (target === "both") {
            this.setTempMinInterval();
        }

        if (!target) {
            target = this.target || "from";
        }

        this.currentPlugin = this.pluginCount;
        this.target = target;

        this.isActive = true;
        this.dragging = true;

        this.coords.x.gap = RangeSlider.getOffset(this.domElement.getElement(RangeSliderElement.rangeSlider)).left;
        this.coords.x.pointer = x - this.coords.x.gap;

        this.calcPointerPercent();
        this.changeLevel(target);

        RangeSlider.trigger("focus", this.domElement.getElement(RangeSliderElement.line));

        this.updateScene();
    }

    private static getX(e: MouseEvent | TouchEvent) {
        return e instanceof MouseEvent ? e.pageX : e.touches && e.touches[0].pageX;
    }

    /**
     * Mousedown or touchstart
     * for other slider elements, like diapason line
     */
    private pointerClick(target: string, e: MouseEvent | TouchEvent): void {
        this.domElement.getElement(RangeSliderElement.line).focus();
        e.preventDefault();
        const x = e instanceof MouseEvent ? e.pageX : e.touches && e.touches[0].pageX;
        if (e instanceof MouseEvent && e.button === 2) {
            return;
        }

        this.updateXPosition(target, x);
    }

    private updateXPosition(target: string, x: number) {
        this.currentPlugin = this.pluginCount;
        this.target = target;

        this.isClick = true;
        this.coords.x.gap = RangeSlider.getOffset(this.domElement.getElement(RangeSliderElement.rangeSlider)).left;
        this.coords.x.pointer = RangeSliderConfigurationUtil.toFixed(x - this.coords.x.gap, 0);

        this.forceRedraw = true;
        this.calc();

        RangeSlider.trigger("focus", this.domElement.getElement(RangeSliderElement.line));
    }

    private static trigger(type: string, element: Element) {
        const evt = new Event(type, {bubbles: true, cancelable: true})
        element.dispatchEvent(evt);
    }

    /**
     * Keyboard controls for focused slider
     */
    private key(e: KeyboardEvent) {
        if (this.currentPlugin !== this.pluginCount || e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
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
    }

    /**
     * Move by key
     */
    private moveByKey(right: boolean): void {
        let p = this.coords.percents.pointer;
        let percentsStep = (this.configuration.max - this.configuration.min) / 100;
        percentsStep = this.configuration.step / percentsStep;

        if (right) {
            p += percentsStep;
        } else {
            p -= percentsStep;
        }

        this.coords.x.pointer = RangeSliderConfigurationUtil.toFixed(this.coords.width.rs / 100 * p);
        this.isKey = true;
        this.calc();
    }

    private static outerWidth(el: HTMLElement, includeMargin = false): number {
        let width = el.offsetWidth;
        if (includeMargin) {
            const style = getComputedStyle(el);
            width += parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10);
        }
        return width;
    }

    /**
     * Then dragging interval, prevent interval collapsing
     * using min_interval option
     */
    private setTempMinInterval(): void {
        const interval = this.getToValue() - this.getFromValue();

        if (!this.previousMinInterval) {
            this.previousMinInterval = this.configuration.minInterval;
        }

        this.configuration.minInterval = interval;
    }

    /**
     * Restore min_interval option to original
     */
    private restoreOriginalMinInterval(): void {
        if (this.previousMinInterval) {
            this.configuration.minInterval = this.previousMinInterval;
            this.previousMinInterval = undefined;
        }
    }

    // =============================================================================================================
    // Calculations
    // =============================================================================================================

    /**
     * All calculations and measures start here
     */
    private calc(update = false) {
        if (!this.configuration) {
            return;
        }

        this.calcCount++;

        if (this.calcCount === 10 || update) {
            this.calcCount = 0;
            this.coords.width.rs = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.rangeSlider), false);

            this.calcHandlePercent();
        }

        if (!this.coords.width.rs) {
            return;
        }

        this.calcPointerPercent();
        let handleX = this.getHandleX();

        if (this.target === "both") {
            this.coords.percents.gap = 0;
            handleX = this.getHandleX();
        }

        if (this.target === "click") {
            this.coords.percents.gap = this.coords.percents.handle / 2;
            handleX = this.getHandleX();

            if (this.configuration.dragInterval) {
                this.target = "both_one";
            } else {
                this.target = this.chooseHandle(handleX);
            }
        }

        switch (this.target) {
            case "base":
                this.calcForBaseTarget();
                break;
            case "single":
                if (this.configuration.fromFixed) {
                    break;
                }

                this.coords.percents.singleReal = this.convertToRealPercent(handleX);
                this.coords.percents.singleReal = this.calcWithStep(this.coords.percents.singleReal);
                this.coords.percents.singleReal = this.checkDiapason(this.coords.percents.singleReal, this.configuration.fromMin, this.configuration.fromMax);

                this.coords.percents.singleFake = this.convertToFakePercent(this.coords.percents.singleReal);

                break;

            case "from":
                if (this.configuration.fromFixed) {
                    break;
                }

                this.coords.percents.fromReal = this.convertToRealPercent(handleX);
                this.coords.percents.fromReal = this.calcWithStep(this.coords.percents.fromReal);
                if (this.coords.percents.fromReal > this.coords.percents.toReal) {
                    this.coords.percents.fromReal = this.coords.percents.toReal;
                }
                this.coords.percents.fromReal = this.checkDiapason(this.coords.percents.fromReal, this.configuration.fromMin, this.configuration.fromMax);
                this.coords.percents.fromReal = this.checkMinInterval(this.coords.percents.fromReal, this.coords.percents.toReal, "from");
                this.coords.percents.fromReal = this.checkMaxInterval(this.coords.percents.fromReal, this.coords.percents.toReal, "from");

                this.coords.percents.fromFake = this.convertToFakePercent(this.coords.percents.fromReal);

                break;

            case "to":
                if (this.configuration.toFixed) {
                    break;
                }

                this.coords.percents.toReal = this.convertToRealPercent(handleX);
                this.coords.percents.toReal = this.calcWithStep(this.coords.percents.toReal);
                if (this.coords.percents.toReal < this.coords.percents.fromReal) {
                    this.coords.percents.toReal = this.coords.percents.fromReal;
                }
                this.coords.percents.toReal = this.checkDiapason(this.coords.percents.toReal, this.configuration.toMin, this.configuration.toMax);
                this.coords.percents.toReal = this.checkMinInterval(this.coords.percents.toReal, this.coords.percents.fromReal, "to");
                this.coords.percents.toReal = this.checkMaxInterval(this.coords.percents.toReal, this.coords.percents.fromReal, "to");

                this.coords.percents.toFake = this.convertToFakePercent(this.coords.percents.toReal);

                break;

            case "both":
                if (this.configuration.fromFixed || this.configuration.toFixed) {
                    break;
                }

                handleX = RangeSliderConfigurationUtil.toFixed(handleX + this.coords.percents.handle * 0.001);

                this.coords.percents.fromReal = this.convertToRealPercent(handleX) - this.coords.percents.gapLeft;
                this.coords.percents.fromReal = this.calcWithStep(this.coords.percents.fromReal);
                this.coords.percents.fromReal = this.checkDiapason(this.coords.percents.fromReal, this.configuration.fromMin, this.configuration.fromMax);
                this.coords.percents.fromReal = this.checkMinInterval(this.coords.percents.fromReal, this.coords.percents.toReal, "from");
                this.coords.percents.fromFake = this.convertToFakePercent(this.coords.percents.fromReal);

                this.coords.percents.toReal = this.convertToRealPercent(handleX) + this.coords.percents.gapRight;
                this.coords.percents.toReal = this.calcWithStep(this.coords.percents.toReal);
                this.coords.percents.toReal = this.checkDiapason(this.coords.percents.toReal, this.configuration.toMin, this.configuration.toMax);
                this.coords.percents.toReal = this.checkMinInterval(this.coords.percents.toReal, this.coords.percents.fromReal, "to");
                this.coords.percents.toFake = this.convertToFakePercent(this.coords.percents.toReal);

                break;

            case "both_one":
                this.calcForBothOneTarget(this.convertToRealPercent(handleX));
                break;
        }

        if (this.configuration.type === "single") {
            this.coords.percents.barX = this.coords.percents.handle / 2;
            this.coords.percents.barW = this.coords.percents.singleFake;
        } else {
            this.coords.percents.barX = RangeSliderConfigurationUtil.toFixed(this.coords.percents.fromFake + this.coords.percents.handle / 2);
            this.coords.percents.barW = RangeSliderConfigurationUtil.toFixed(this.coords.percents.toFake - this.coords.percents.fromFake);
        }

        this.calcMinMax();
        this.calcLabels();
    }

    private calcForBaseTarget() {
        const w = (this.configuration.max - this.configuration.min) / 100,
            f = (this.getFromValue() - this.configuration.min) / w,
            t = (this.getToValue() - this.configuration.min) / w;

        this.coords.percents.singleReal = RangeSliderConfigurationUtil.toFixed(f);
        this.coords.percents.fromReal = RangeSliderConfigurationUtil.toFixed(f);
        this.coords.percents.toReal = RangeSliderConfigurationUtil.toFixed(t);

        this.coords.percents.singleReal = this.checkDiapason(this.coords.percents.singleReal, this.configuration.fromMin, this.configuration.fromMax);
        this.coords.percents.fromReal = this.checkDiapason(this.coords.percents.fromReal, this.configuration.fromMin, this.configuration.fromMax);
        this.coords.percents.toReal = this.checkDiapason(this.coords.percents.toReal, this.configuration.toMin, this.configuration.toMax);

        this.coords.percents.singleFake = this.convertToFakePercent(this.coords.percents.singleReal);
        this.coords.percents.fromFake = this.convertToFakePercent(this.coords.percents.fromReal);
        this.coords.percents.toFake = this.convertToFakePercent(this.coords.percents.toReal);

        this.target = undefined;
    }

    private calcForBothOneTarget(realX: number) {
        if (this.configuration.fromFixed || this.configuration.toFixed) {
            return;
        }

        const full = this.coords.percents.toReal - this.coords.percents.fromReal,
            half = full / 2;

        let newFrom = realX - half,
            newTo = realX + half;

        if (newFrom < 0) {
            newFrom = 0;
            newTo = newFrom + full;
        }

        if (newTo > 100) {
            newTo = 100;
            newFrom = newTo - full;
        }

        this.coords.percents.fromReal = this.calcWithStep(newFrom);
        this.coords.percents.fromReal = this.checkDiapason(this.coords.percents.fromReal, this.configuration.fromMin, this.configuration.fromMax);
        this.coords.percents.fromFake = this.convertToFakePercent(this.coords.percents.fromReal);

        this.coords.percents.toReal = this.calcWithStep(newTo);
        this.coords.percents.toReal = this.checkDiapason(this.coords.percents.toReal, this.configuration.toMin, this.configuration.toMax);
        this.coords.percents.toFake = this.convertToFakePercent(this.coords.percents.toReal);
    }

    /**
     * calculates pointer X in percent
     */
    private calcPointerPercent(): void {
        if (!this.coords.width.rs) {
            this.coords.percents.pointer = 0;
            return;
        }

        if (this.coords.x.pointer < 0 || isNaN(this.coords.x.pointer)) {
            this.coords.x.pointer = 0;
        } else if (this.coords.x.pointer > this.coords.width.rs) {
            this.coords.x.pointer = this.coords.width.rs;
        }

        this.coords.percents.pointer = RangeSliderConfigurationUtil.toFixed(this.coords.x.pointer / this.coords.width.rs * 100);
    }

    private convertToRealPercent(fake: number): number {
        const full = 100 - this.coords.percents.handle;
        return fake / full * 100;
    }

    private convertToFakePercent(real: number): number {
        const full = 100 - this.coords.percents.handle;
        return real / 100 * full;
    }

    private getHandleX(): number {
        // eslint-disable-next-line no-console
        console.log(this.coords);
        const max = 100 - this.coords.percents.handle;
        let x = RangeSliderConfigurationUtil.toFixed(this.coords.percents.pointer - this.coords.percents.gap);

        if (x < 0) {
            x = 0;
        } else if (x > max) {
            x = max;
        }

        return x;
    }

    private calcHandlePercent(): void {
        if (this.configuration.type === "single") {
            this.coords.width.handle = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.singleHandle), false);
        } else {
            this.coords.width.handle = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.spanFrom), false);
        }

        this.coords.percents.handle = RangeSliderConfigurationUtil.toFixed(this.coords.width.handle / this.coords.width.rs * 100);
    }

    /**
     * Find closest handle to pointer click
     */
    private chooseHandle(realX: number): string {
        if (this.configuration.type === "single") {
            return "single";
        } else {
            const mousePoint = this.coords.percents.fromReal + (this.coords.percents.toReal - this.coords.percents.fromReal) / 2;
            if (realX >= mousePoint) {
                return this.configuration.toFixed ? "from" : "to";
            } else {
                return this.configuration.fromFixed ? "to" : "from";
            }
        }
    }

    /**
     * Measure Min and Max labels width in percent
     */
    private calcMinMax(): void {
        if (!this.coords.width.rs) {
            return;
        }

        this.labels.percents.min = this.labels.width.min / this.coords.width.rs * 100;
        this.labels.percents.max = this.labels.width.max / this.coords.width.rs * 100;
    }

    /**
     * Measure labels width and X in percent
     */
    private calcLabels(): void {
        if (!this.coords.width.rs || this.configuration.hideFromTo) {
            return;
        }

        if (this.configuration.type === "single") {
            this.labels.width.single = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.spanSingle), false);
            this.labels.percents.singleFake = this.labels.width.single / this.coords.width.rs * 100;
            this.labels.percents.singleLeft = this.coords.percents.singleFake + this.coords.percents.handle / 2 - this.labels.percents.singleFake / 2;
            this.labels.percents.singleLeft = this.checkEdges(this.labels.percents.singleLeft, this.labels.percents.singleFake);
        } else {
            this.labels.width.from = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.from), false);
            this.labels.percents.fromFake = this.labels.width.from / this.coords.width.rs * 100;
            this.labels.percents.fromLeft = this.coords.percents.fromFake + this.coords.percents.handle / 2 - this.labels.percents.fromFake / 2;
            this.labels.percents.fromLeft = RangeSliderConfigurationUtil.toFixed(this.labels.percents.fromLeft);
            this.labels.percents.fromLeft = this.checkEdges(this.labels.percents.fromLeft, this.labels.percents.fromFake);

            this.labels.width.to = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.to), false);
            this.labels.percents.toFake = this.labels.width.to / this.coords.width.rs * 100;
            this.labels.percents.toLeft = this.coords.percents.toFake + this.coords.percents.handle / 2 - this.labels.percents.toFake / 2;
            this.labels.percents.toLeft = RangeSliderConfigurationUtil.toFixed(this.labels.percents.toLeft);
            this.labels.percents.toLeft = this.checkEdges(this.labels.percents.toLeft, this.labels.percents.toFake);

            this.labels.width.single = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.spanSingle), false);
            this.labels.percents.singleFake = this.labels.width.single / this.coords.width.rs * 100;
            this.labels.percents.singleLeft = (this.labels.percents.fromLeft + this.labels.percents.toLeft + this.labels.percents.toFake) / 2 - this.labels.percents.singleFake / 2;
            this.labels.percents.singleLeft = RangeSliderConfigurationUtil.toFixed(this.labels.percents.singleLeft);
            this.labels.percents.singleLeft = this.checkEdges(this.labels.percents.singleLeft, this.labels.percents.singleFake);
        }
    }

    // =============================================================================================================
    // Drawings
    // =============================================================================================================

    /**
     * Main function called in request animation frame
     * to update everything
     */
    private updateScene(): void {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = undefined;
        }

        clearTimeout(this.updateTimeoutId);
        this.updateTimeoutId = undefined;

        if (!this.configuration) {
            return;
        }

        this.drawHandles();

        if (this.isActive) {
            this.rafId = requestAnimationFrame(() => this.updateScene());
        } else {
            this.updateTimeoutId = window.setTimeout(() => this.updateScene(), 300);
        }
    }

    /**
     * Draw handles
     */
    private drawHandles(): void {
        this.coords.width.rs = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.rangeSlider), false);

        if (!this.coords.width.rs) {
            return;
        }

        if (this.coords.width.rs !== this.coords.width.oldRs) {
            this.target = "base";
            this.isResize = true;
        }

        if (this.coords.width.rs !== this.coords.width.oldRs || this.forceRedraw) {
            // this.setMinMax();
            this.calc(true);
            this.drawLabels();
            if (this.configuration.grid) {
                this.calcGridMargin();
                this.calcGridLabels();
            }
            this.forceRedraw = true;
            this.coords.width.oldRs = this.coords.width.rs;
            this.drawShadow();
        }

        if (!this.coords.width.rs) {
            return;
        }

        if (!this.dragging && !this.forceRedraw && !this.isKey) {
            return;
        }

        const from = this.getFromValue(), to = this.getToValue();
        if (this.previousResultFrom !== from || this.previousResultTo !== to || this.forceRedraw || this.isKey) {

            this.drawLabels();


            const barElement = this.domElement.getElement(RangeSliderElement.bar);
            barElement.style.left = this.coords.percents.barX.toString(10) + "%";
            barElement.style.width = this.coords.percents.barW.toString(10) + "%";

            if (this.configuration.type === "single") {
                barElement.style.left = "0";
                barElement.style.width = this.coords.percents.barW.toString(10) + this.coords.percents.barX.toString(10) + "%";

                this.domElement.getElement(RangeSliderElement.singleHandle).style.left = this.coords.percents.singleFake.toString(10) + "%";

                this.domElement.getElement(RangeSliderElement.spanSingle).style.left = this.labels.percents.singleLeft.toString(10) + "%";
            } else {
                this.domElement.getElement(RangeSliderElement.spanFrom).style.left = this.coords.percents.fromFake.toString(10) + "%";
                this.domElement.getElement(RangeSliderElement.spanTo).style.left = this.coords.percents.toFake.toString(10) + "%";

                if (this.previousResultFrom !== from || this.forceRedraw) {
                    this.domElement.getElement(RangeSliderElement.from).style.left = this.labels.percents.fromLeft.toString(10) + "%";
                }
                if (this.previousResultTo !== to || this.forceRedraw) {
                    this.domElement.getElement(RangeSliderElement.to).style.left = this.labels.percents.toLeft.toString(10) + "%";
                }

                this.domElement.getElement(RangeSliderElement.spanSingle).style.left = this.labels.percents.singleLeft.toString(10) + "%";
            }

            this.writeToInput();

            if ((this.previousResultFrom !== from || this.previousResultTo !== to) && !this.isStart) {
                RangeSlider.trigger("input", this.domElement.getInput());
            }

            this.previousResultFrom = from;
            this.previousResultTo = to;

            // callbacks call
            if (!this.isResize && !this.isUpdate && !this.isStart && !this.isFinish) {
                this.callOnChange();
            }
            if (this.isKey || this.isClick) {
                this.isKey = false;
                this.isClick = false;
                this.callOnFinish();
            }

            this.isUpdate = false;
            this.isResize = false;
            this.isFinish = false;
        }

        this.isStart = false;
        this.isKey = false;
        this.isClick = false;
        this.forceRedraw = false;
    }

    /**
     * Draw labels
     * measure labels collisions
     * collapse close labels
     */
    private drawLabels(): void {
        if (!this.configuration) {
            return;
        }

        if (this.configuration.hideFromTo) {
            return;
        }

        const from = this.getFromValue(), to = this.getToValue();
        if (this.configuration.type === "single") {
            this.domElement.getElement(RangeSliderElement.spanSingle).innerHTML = this.state.decorate(from);

            this.calcLabels();

            if (this.labels.percents.singleLeft < this.labels.percents.min + 1) {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "visible";
            }

            if (this.labels.percents.singleLeft + this.labels.percents.singleFake > 100 - this.labels.percents.max - 1) {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "visible";
            }

        } else {
            this.domElement.getElement(RangeSliderElement.spanSingle).innerHTML = this.state.decorateForCollapsedValues(from,to);
            this.domElement.getElement(RangeSliderElement.from).innerHTML = this.state.decorate(from);
            this.domElement.getElement(RangeSliderElement.to).innerHTML = this.state.decorate(to);

            this.calcLabels();

            const min = Math.min(this.labels.percents.singleLeft, this.labels.percents.fromLeft),
                singleLeft = this.labels.percents.singleLeft + this.labels.percents.singleFake,
                toLeft = this.labels.percents.toLeft + this.labels.percents.toFake;
            let max = Math.max(singleLeft, toLeft);

            if (this.labels.percents.fromLeft + this.labels.percents.fromFake >= this.labels.percents.toLeft) {
                this.domElement.getElement(RangeSliderElement.from).style.visibility = "hidden";
                this.domElement.getElement(RangeSliderElement.to).style.visibility = "hidden";
                this.domElement.getElement(RangeSliderElement.spanSingle).style.visibility = "visible";

                if (from === to) {
                    if (this.target === "from") {
                        this.domElement.getElement(RangeSliderElement.from).style.visibility = "visible";
                    } else if (this.target === "to") {
                        this.domElement.getElement(RangeSliderElement.to).style.visibility = "visible";
                    } else if (!this.target) {
                        this.domElement.getElement(RangeSliderElement.from).style.visibility = "visible";
                    }
                    this.domElement.getElement(RangeSliderElement.spanSingle).style.visibility = "hidden";
                    max = toLeft;
                } else {
                    this.domElement.getElement(RangeSliderElement.from).style.visibility = "hidden";
                    this.domElement.getElement(RangeSliderElement.to).style.visibility = "hidden";
                    this.domElement.getElement(RangeSliderElement.spanSingle).style.visibility = "visible";
                    max = Math.max(singleLeft, toLeft);
                }
            } else {
                this.domElement.getElement(RangeSliderElement.from).style.visibility = "visible";
                this.domElement.getElement(RangeSliderElement.to).style.visibility = "visible";
                this.domElement.getElement(RangeSliderElement.spanSingle).style.visibility = "hidden";
            }

            if (min < this.labels.percents.min + 1) {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "visible";
            }

            if (max > 100 - this.labels.percents.max - 1) {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "visible";
            }

        }
    }

    /**
     * Draw shadow intervals
     */
    private drawShadow(): void {
        const o = this.configuration,
            isFromMin = typeof o.fromMin === "number" && !isNaN(o.fromMin),
            isFromMax = typeof o.fromMax === "number" && !isNaN(o.fromMax),
            isToMin = typeof o.toMin === "number" && !isNaN(o.toMin),
            isToMax = typeof o.toMax === "number" && !isNaN(o.toMax);

        let fromMin: number,
            fromMax: number,
            toMin: number,
            toMax: number;

        if (o.type === "single") {
            const shadowSingle = this.domElement.getElement(RangeSliderElement.shadowSingle);
            if (o.fromShadow && (isFromMin || isFromMax)) {
                fromMin = this.convertToPercent(isFromMin ? o.fromMin : o.min);
                fromMax = this.convertToPercent(isFromMax ? o.fromMax : o.max) - fromMin;
                fromMin = RangeSliderConfigurationUtil.toFixed(fromMin - this.coords.percents.handle / 100 * fromMin);
                fromMax = RangeSliderConfigurationUtil.toFixed(fromMax - this.coords.percents.handle / 100 * fromMax);
                fromMin = fromMin + this.coords.percents.handle / 2;

                shadowSingle.style.display = "block";
                shadowSingle.style.left = fromMin.toString(10) + "%";
                shadowSingle.style.width = fromMax.toString(10) + "%";
            } else {
                shadowSingle.style.display = "none";
            }
        } else {
            const shadowFrom = this.domElement.getElement(RangeSliderElement.shadowFrom);

            if (o.fromShadow && (isFromMin || isFromMax)) {
                fromMin = this.convertToPercent(isFromMin ? o.fromMin : o.min);
                fromMax = this.convertToPercent(isFromMax ? o.fromMax : o.max) - fromMin;
                fromMin = RangeSliderConfigurationUtil.toFixed(fromMin - this.coords.percents.handle / 100 * fromMin);
                fromMax = RangeSliderConfigurationUtil.toFixed(fromMax - this.coords.percents.handle / 100 * fromMax);
                fromMin = fromMin + this.coords.percents.handle / 2;

                shadowFrom.style.display = "block";
                shadowFrom.style.left = fromMin.toString(10) + "%";
                shadowFrom.style.width = fromMax.toString(10) + "%";
            } else {
                shadowFrom.style.display = "none";
            }

            const shadowTo = this.domElement.getElement(RangeSliderElement.shadowTo);

            if (o.toShadow && (isToMin || isToMax)) {
                toMin = this.convertToPercent(isToMin ? o.toMin : o.min);
                toMax = this.convertToPercent(isToMax ? o.toMax : o.max) - toMin;
                toMin = RangeSliderConfigurationUtil.toFixed(toMin - this.coords.percents.handle / 100 * toMin);
                toMax = RangeSliderConfigurationUtil.toFixed(toMax - this.coords.percents.handle / 100 * toMax);
                toMin = toMin + this.coords.percents.handle / 2;

                shadowTo.style.display = "block";
                shadowTo.style.left = toMin.toString(10) + "%";
                shadowTo.style.width = toMax.toString(10) + "%";
            } else {
                shadowTo.style.display = "none";
            }
        }
    }

    /**
     * Write values to input element
     */
    private writeToInput(): void {
        const from = this.getFromValue(),
            input = this.domElement.getInput();
        if (this.configuration.type === "single") {
            if (this.configuration.values.length) {
                const value = this.configuration.values[from];
                input.value = typeof value === "number" ? value.toString(10) : value;
            } else {
                input.value = from.toString(10);
            }
            input.dataset.from = from.toString(10);
        } else {
            const to = this.getToValue();
            if (this.configuration.values.length) {
                input.value = `${this.configuration.values[from]}${this.configuration.inputValuesSeparator}${this.configuration.values[to]}`;
            } else {
                input.value = `${from}${this.configuration.inputValuesSeparator}${to}`;
            }
            input.dataset.from = from.toString(10);
            input.dataset.to = to.toString(10);
        }
    }

    private getFromValue(): number {
        if (this.configuration.type === SliderType.single) {
            return this.state.convertToValue(this.coords.percents.singleReal);
        } else {
            return this.state.convertToValue(this.coords.percents.fromReal);
        }
    }

    private getToValue(): number {
        if (this.configuration.type === SliderType.single) {
            return this.configuration.to;
        } else {
            return this.state.convertToValue(this.coords.percents.toReal);
        }
    }

    // =============================================================================================================
    // Callbacks
    // =============================================================================================================

    private callOnStart(): void {
        this.writeToInput();

        if (this.configuration.onStart && typeof this.configuration.onStart === "function") {
            const event = new RangeSliderEvent(this.configuration, this.state, this.domElement.getInput(), this.domElement.getContainer(), this.coords.percents);
            if (this.configuration.callbackScope) {
                this.configuration.onStart.call(this.configuration.callbackScope, event);
            } else {
                this.configuration.onStart(event);
            }
        }
    }

    private callOnChange(): void {
        this.writeToInput();

        if (this.configuration.onChange && typeof this.configuration.onChange === "function") {
            const event = new RangeSliderEvent(this.configuration, this.state, this.domElement.getInput(), this.domElement.getContainer(), this.coords.percents);
            if (this.configuration.callbackScope) {
                this.configuration.onChange.call(this.configuration.callbackScope, event);
            } else {
                this.configuration.onChange(event);
            }
        }
    }

    private callOnFinish(): void {
        this.writeToInput();

        if (this.configuration.onFinish && typeof this.configuration.onFinish === "function") {
            const event = new RangeSliderEvent(this.configuration, this.state, this.domElement.getInput(), this.domElement.getContainer(), this.coords.percents);
            if (this.configuration.callbackScope) {
                this.configuration.onFinish.call(this.configuration.callbackScope, event);
            } else {
                this.configuration.onFinish(event);
            }
        }
    }

    private callOnUpdate(): void {
        this.writeToInput();

        if (this.configuration.onUpdate && typeof this.configuration.onUpdate === "function") {
            const event = new RangeSliderEvent(this.configuration, this.state, this.domElement.getInput(), this.domElement.getContainer(), this.coords.percents);
            if (this.configuration.callbackScope) {
                this.configuration.onUpdate.call(this.configuration.callbackScope, event);
            } else {
                this.configuration.onUpdate(event);
            }
        }
    }

    // =============================================================================================================
    // Service methods
    // =============================================================================================================

    private toggleInput(): void {
        const input = this.domElement.getInput();
        input.classList.toggle("irs-hidden-input");

        if (this.hasTabIndex) {
            input.tabIndex = -1;
        } else {
            input.removeAttribute("tabindex");
        }

        this.hasTabIndex = !this.hasTabIndex;
    }

    /**
     * Convert real value to percent
     */
    private convertToPercent(value: number, noMin = false): number {
        const diapason = this.configuration.max - this.configuration.min,
            onePercent = diapason / 100;
        let val;

        if (!diapason) {
            this.noDiapason = true;
            return 0;
        }

        if (noMin) {
            val = value;
        } else {
            val = value - this.configuration.min;
        }

        return RangeSliderConfigurationUtil.toFixed(val / onePercent);
    }

    /**
     * Round percent value with step
     */
    private calcWithStep(percent: number): number {
        let rounded = Math.round(percent / this.coords.percents.step) * this.coords.percents.step;

        if (rounded > 100) {
            rounded = 100;
        }
        if (percent === 100) {
            rounded = 100;
        }

        return RangeSliderConfigurationUtil.toFixed(rounded);
    }

    private checkMinInterval(currentPercent: number, nextPercent: number, type): number {
        return this.checkInterval(this.configuration.minInterval, currentPercent, nextPercent, type);
    }

    private checkMaxInterval(currentPercent: number, nextPercent: number, type): number {
        return this.checkInterval(this.configuration.maxInterval, currentPercent, nextPercent, type);
    }

    private checkInterval(interval: number, currentPercent: number, nextPercent: number, type): number {
        if (!interval) {
            return currentPercent;
        }

        let current: number = this.state.convertToValue(currentPercent);
        const next = this.state.convertToValue(nextPercent);

        if (type === "from") {

            if (next - current > interval) {
                current = next - interval;
            }
        } else {

            if (current - next > interval) {
                current = next + interval;
            }
        }

        return this.convertToPercent(current);
    }

    private checkDiapason(numberPercent: number, min: number, max: number) {
        let num = this.state.convertToValue(numberPercent);

        if (typeof min !== "number") {
            min = this.configuration.min;
        }

        if (typeof max !== "number") {
            max = this.configuration.max;
        }

        if (num < min) {
            num = min;
        }

        if (num > max) {
            num = max;
        }

        return this.convertToPercent(num);
    }

    private checkEdges(left: number, width: number): number {
        if (!this.configuration.forceEdges) {
            return RangeSliderConfigurationUtil.toFixed(left);
        }

        if (left < 0) {
            left = 0;
        } else if (left > 100 - width) {
            left = 100 - width;
        }

        return RangeSliderConfigurationUtil.toFixed(left);
    }

    // =============================================================================================================
    // Grid
    // =============================================================================================================

    private calcGridLabels(): void {
        const start: number[] = [], finish: number[] = [], num = this.coords.bigNum;
        for (let i = 0; i < num; i++) {
            this.coords.bigW[i] = RangeSlider.outerWidth(this.domElement.getLabel(i), false);
            this.coords.bigP[i] = RangeSliderConfigurationUtil.toFixed(this.coords.bigW[i] / this.coords.width.rs * 100);
            this.coords.bigX[i] = RangeSliderConfigurationUtil.toFixed(this.coords.bigP[i] / 2);

            start[i] = RangeSliderConfigurationUtil.toFixed(this.coords.big[i] - this.coords.bigX[i]);
            finish[i] = RangeSliderConfigurationUtil.toFixed(start[i] + this.coords.bigP[i]);
        }

        if (this.configuration.forceEdges) {
            if (start[0] < -this.coords.gridGap) {
                start[0] = -this.coords.gridGap;
                finish[0] = RangeSliderConfigurationUtil.toFixed(start[0] + this.coords.bigP[0]);

                this.coords.bigX[0] = this.coords.gridGap;
            }

            if (finish[num - 1] > 100 + this.coords.gridGap) {
                finish[num - 1] = 100 + this.coords.gridGap;
                start[num - 1] = RangeSliderConfigurationUtil.toFixed(finish[num - 1] - this.coords.bigP[num - 1]);

                this.coords.bigX[num - 1] = RangeSliderConfigurationUtil.toFixed(this.coords.bigP[num - 1] - this.coords.gridGap);
            }
        }

        this.calcGridCollision(2, start, finish);
        this.calcGridCollision(4, start, finish);

        for (let i = 0; i < num; i++) {
            const label = this.domElement.getLabel(i);

            if (this.coords.bigX[i] !== Number.POSITIVE_INFINITY) {
                label.style.marginLeft = `${-this.coords.bigX[i]}%`;
            }
        }
    }

    private calcGridCollision(step, start: number[], finish: number[]): void {
        let nextIndex: number;
        const num = this.coords.bigNum;

        for (let i = 0; i < num; i += step) {
            nextIndex = i + step / 2;
            if (nextIndex >= num) {
                break;
            }

            const label = this.domElement.getLabel(nextIndex);

            if (finish[i] <= start[nextIndex]) {
                label.style.visibility = "visible";
            } else {
                label.style.visibility = "hidden";
            }
        }
    }

    private calcGridMargin(): void {
        if (!this.configuration.gridMargin) {
            return;
        }

        this.coords.width.rs = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.rangeSlider), false);
        if (!this.coords.width.rs) {
            return;
        }

        if (this.configuration.type === "single") {
            this.coords.width.handle = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.singleHandle), false);
        } else {
            this.coords.width.handle = RangeSlider.outerWidth(this.domElement.getElement(RangeSliderElement.spanFrom), false);
        }
        this.coords.percents.handle = RangeSliderConfigurationUtil.toFixed(this.coords.width.handle / this.coords.width.rs * 100);
        this.coords.gridGap = RangeSliderConfigurationUtil.toFixed(this.coords.percents.handle / 2 - 0.1);

        const grid = this.domElement.getElement(RangeSliderElement.grid);
        grid.style.width = `${RangeSliderConfigurationUtil.toFixed(100 - this.coords.percents.handle)}%`;
        grid.style.left = `${this.coords.gridGap}%`;
    }

    // =============================================================================================================
    // Public methods
    // =============================================================================================================

    update(options?: Partial<IRangeSliderOptions<number | string>>) {
        if (!this.input) {
            return;
        }

        this.isUpdate = true;

        // Todo changer pour updateScene ? => éviter d'avoir à garder from courant et to courant dans configuration
        const from = this.getFromValue();
        this.configuration.from = from;
        if (this.configuration.type === SliderType.double) {
            this.configuration.to = this.getToValue();
        }
        this.updateCheck = {from: from, to: this.configuration.to};

        this.configuration = RangeSliderConfigurationUtil.mergeConfigurations(this.configuration, options, this.updateCheck);
        this.state = new RangeSliderState(this.configuration);

        this.toggleInput();
        this.remove();
        this.init(true);
    }

    reset(): void {
        if (!this.input) {
            return;
        }

        this.update();
    }

    destroy(): void {
        if (!this.input) {
            return;
        }

        this.toggleInput();
        this.domElement.getInput().readOnly = false;

        this.remove();
        this.input = undefined;
        this.configuration = undefined;
    }
}
