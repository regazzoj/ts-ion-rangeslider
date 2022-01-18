import {ICacheRangeSlider, Template} from "../interfaces/cache-range-slider";
import {
    RangeSliderConfigurationUtil
} from "./range-slider-configuration-util";
import {IRangeSliderConfiguration} from "../interfaces/range-slider-configuration";
import {RangeSliderEvent} from "../interfaces/range-slider-event";

export interface ISlider {
    destroy(): void;

    reset(): void;

    update(option: Partial<IRangeSliderConfiguration>): void;
}

export class Slider implements ISlider {
    private static currentPluginCount = 0;

    private readonly cache: ICacheRangeSlider;
    private readonly pluginCount: number;
    private readonly result: RangeSliderEvent;

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
    private configuration: IRangeSliderConfiguration;
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
        return Slider.currentPluginCount++;
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

    // =================================================================================================================
    // Core
    // =================================================================================================================

    constructor(input: HTMLInputElement, options: Partial<IRangeSliderConfiguration>) {
        this.input = input;
        this.pluginCount = Slider.getCurrentPluginCount();

        options = options || {};

        // cache for links to all DOM elements
        this.cache = {
            win: window,
            body: document.body,
            input: input,
            cont: null,
            rs: null,
            min: null,
            max: null,
            from: null,
            to: null,
            single: null,
            bar: null,
            line: null,
            spanSingle: null,
            spanFrom: null,
            spanTo: null,
            shadowSingle: null,
            shadowFrom: null,
            shadowTo: null,
            edge: null,
            grid: null,
            gridLabels: []
        };

        /**
         * get and validate config
         */
        const inputElement = this.cache.input;
        if (!inputElement) {
            throw Error("Given input element does not exist")
        }

        // check if base element is input
        if (inputElement.nodeName !== "INPUT") {
            throw Error("Base element should be <input>!");
        }

        // merge configurations
        this.configuration = RangeSliderConfigurationUtil.initializeConfiguration(options, inputElement.value);

        // validate config, to be sure that all data types are correct
        this.updateCheck = undefined;

        // default result object, returned to callbacks
        this.result = {
            input: this.cache.input,
            slider: undefined,

            min: this.configuration.min,
            max: this.configuration.max,

            from: this.configuration.from,
            fromPercent: 0,
            fromValue: undefined,

            to: this.configuration.to,
            toPercent: 0,
            toValue: undefined,

            minPretty: undefined,
            maxPretty: undefined,

            fromPretty: undefined,
            toPretty: undefined
        };

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
        this.append();
        this.setMinMax();

        if (isUpdate) {
            this.forceRedraw = true;
            this.calc(true);

            // callbacks called
            this.callOnUpdate();
        } else {
            this.forceRedraw = true;
            this.calc(true);

            // callbacks called
            this.callOnStart();
        }

        this.updateScene();
    }

    /**
     * Appends slider template to a DOM
     */
    private append(): void {
        const extraClasses = (this.configuration.extraClasses.length > 0 ? " ":"")+this.configuration.extraClasses;
        const containerHtml = `<span class="irs irs--${this.configuration.skin} js-irs-${this.pluginCount} ${extraClasses}"></span>`;

        if (!this.cache.input) {
            throw Error("Given input element does not exist");
        }

        this.cache.input.insertAdjacentHTML("beforebegin", containerHtml);
        this.cache.input.readOnly = true;
        this.cache.cont = this.cache.input.previousElementSibling;

        if (!this.cache.cont) {
            throw Error("Cache container could not be added before the input")
        }

        this.result.slider = this.cache.cont;

        this.cache.cont.innerHTML = Template.baseHtml;
        this.cache.rs = this.cache.cont.querySelector(".irs");
        this.cache.min = this.cache.cont.querySelector(".irs-min");
        this.cache.max = this.cache.cont.querySelector(".irs-max");
        this.cache.from = this.cache.cont.querySelector(".irs-from");
        this.cache.to = this.cache.cont.querySelector(".irs-to");
        this.cache.single = this.cache.cont.querySelector(".irs-single");
        this.cache.line = this.cache.cont.querySelector(".irs-line");
        this.cache.grid = this.cache.cont.querySelector(".irs-grid");

        if (this.configuration.type === "single") {
            this.cache.cont.insertAdjacentHTML("beforeend", Template.singleHtml);
            this.cache.bar = this.cache.cont.querySelector(".irs-bar");
            this.cache.edge = this.cache.cont.querySelector(".irs-bar-edge");
            this.cache.spanSingle = this.cache.cont.querySelector(".single");
            this.cache.from.style.visibility = "hidden";
            this.cache.to.style.visibility = "hidden";
            this.cache.shadowSingle = this.cache.cont.querySelector(".shadow-single");
        } else {
            this.cache.cont.insertAdjacentHTML("beforeend", Template.doubleHtml);
            this.cache.bar = this.cache.cont.querySelector(".irs-bar");
            this.cache.spanFrom = this.cache.cont.querySelector(".from");
            this.cache.spanTo = this.cache.cont.querySelector(".to");
            this.cache.shadowFrom = this.cache.cont.querySelector(".shadow-from");
            this.cache.shadowTo = this.cache.cont.querySelector(".shadow-to");

            this.setTopHandler();
        }

        if (this.configuration.hideFromTo) {
            this.cache.from.style.display = "none";
            this.cache.to.style.display = "none";
            this.cache.single.style.display = "none";
        }

        this.appendGrid();

        if (this.configuration.disable) {
            this.appendDisableMask();
            this.cache.input.disabled = true;
        } else {
            this.cache.input.disabled = false;
            this.removeDisableMask();
            this.bindEvents();
        }

        // block only if not disabled
        if (!this.configuration.disable) {
            if (this.configuration.block) {
                this.appendDisableMask();
            } else {
                this.removeDisableMask();
            }
        }

        if (this.configuration.dragInterval) {
            this.cache.bar.style.cursor = "ew-resize";
        }
    }

    /**
     * Determine which handler has a priority
     * works only for double slider type
     */
    private setTopHandler(): void {
        const min = this.configuration.min,
            max = this.configuration.max,
            from = this.configuration.from,
            to = this.configuration.to;

        if (from > min && to === max) {
            this.cache.spanFrom.classList.add("type_last");
        } else if (to < max) {
            this.cache.spanTo.classList.add("type_last");
        }
    }

    /**
     * Determine which handles was clicked last
     * and which handler should have hover effect
     */
    private changeLevel(target: string): void {
        switch (target) {
            case "single":
                this.coords.percents.gap = Slider.toFixed(this.coords.percents.pointer - this.coords.percents.singleFake);
                this.cache.spanSingle.classList.add("state_hover");
                break;
            case "from":
                this.coords.percents.gap = Slider.toFixed(this.coords.percents.pointer - this.coords.percents.fromFake);
                this.cache.spanFrom.classList.add("state_hover");
                this.cache.spanFrom.classList.add("type_last");
                this.cache.spanTo.classList.remove("type_last");
                break;
            case "to":
                this.coords.percents.gap = Slider.toFixed(this.coords.percents.pointer - this.coords.percents.toFake);
                this.cache.spanTo.classList.add("state_hover");
                this.cache.spanTo.classList.add("type_last");
                this.cache.spanFrom.classList.remove("type_last");
                break;
            case "both":
                this.coords.percents.gapLeft = Slider.toFixed(this.coords.percents.pointer - this.coords.percents.fromFake);
                this.coords.percents.gapRight = Slider.toFixed(this.coords.percents.toFake - this.coords.percents.pointer);
                this.cache.spanTo.classList.remove("type_last");
                this.cache.spanFrom.classList.remove("type_last");
                break;
        }
    }

    /**
     * Then slider is disabled
     * appends extra layer with opacity
     */
    private appendDisableMask(): void {
        this.cache.cont.innerHTML = Template.disableHtml;
        this.cache.cont.classList.add("irs-disabled");
    }

    /**
     * Then slider is not disabled
     * remove disable mask
     */
    private removeDisableMask(): void {
        Slider.removeElement(this.cache.cont.querySelector(".irs-disable-mask"));
        this.cache.cont.classList.remove("irs-disabled");
    }

    private static removeElement(element: Element | null): void {
        if (element) {
            element.parentNode?.removeChild(element);
        }
    }

    /**
     * Remove slider instance
     * and unbind all events
     */
    private remove(): void {
        Slider.removeElement(this.cache.cont);
        this.cache.cont = null;

        this.unbindEvents();

        this.cache.gridLabels = [];
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
     * bind all slider events
     */
    private bindEvents(): void {
        if (this.noDiapason) {
            return;
        }

        this.cache.body.addEventListener("touchmove", (e: TouchEvent) => this.pointerMove(e));
        this.cache.body.addEventListener("mousemove", (e: MouseEvent) => this.pointerMove(e));
        this.cache.win.addEventListener("touchend", (e: TouchEvent) => this.pointerUp(e));
        this.cache.win.addEventListener("mouseup", (e: MouseEvent) => this.pointerUp(e));
        this.cache.line.addEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));
        this.cache.line.addEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
        this.cache.line.addEventListener("focus", () => this.pointerFocus());

        if (this.configuration.dragInterval && this.configuration.type === "double") {
            this.cache.bar.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown("both", e));
            this.cache.bar.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown("both", e));
        } else {
            this.cache.bar.addEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));
            this.cache.bar.addEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
        }

        if (this.configuration.type === "single") {
            this.cache.single.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown("single", e));
            this.cache.spanSingle.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown("single", e));
            this.cache.shadowSingle.addEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));

            this.cache.single.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown("single", e));
            this.cache.spanSingle.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown("single", e));
            this.cache.shadowSingle.addEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));

            if (this.cache.edge) {
                this.cache.edge.addEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
            }
        } else {
            this.cache.single.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown(null, e));
            this.cache.single.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown(null, e));

            this.cache.from.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown("from", e));
            this.cache.spanFrom.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown("from", e));
            this.cache.to.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown("to", e));
            this.cache.spanTo.addEventListener("touchstart", (e: TouchEvent) => this.pointerDown("to", e));
            this.cache.shadowFrom.addEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));
            this.cache.shadowTo.addEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));

            this.cache.from.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown("from", e));
            this.cache.spanFrom.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown("from", e));
            this.cache.to.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown("to", e));
            this.cache.spanTo.addEventListener("mousedown", (e: MouseEvent) => this.pointerDown("to", e));
            this.cache.shadowFrom.addEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
            this.cache.shadowTo.addEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
        }

        if (this.configuration.keyboard) {
            this.cache.line.addEventListener("keydown", (e: KeyboardEvent) => {this.key(e)});
        }

        if (Slider.getIsOldIe()) {
            this.cache.body.addEventListener("mouseup", (e: MouseEvent) => this.pointerUp(e));
            this.cache.body.addEventListener("mouseleave", (e: MouseEvent) => this.pointerUp(e));
        }
    }

    /**
     * Focus with tabIndex
     */
    private pointerFocus(): void {
        if (!this.target) {
            let handle: HTMLHtmlElement;

            if (this.configuration.type === "single") {
                handle = this.cache.single;
            } else {
                handle = this.cache.from;
            }

            if (!handle) {
                throw Error("Handle is not defined");
            }
            let x = Slider.getOffset(handle).left;
            x += (handle.offsetWidth / 2) - 1;

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

        const x = Slider.getX(e);
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

        Slider.removeClass(this.cache.cont.querySelector(".state_hover"), "state_hover");

        this.forceRedraw = true;

        this.updateScene();
        this.restoreOriginalMinInterval();

        // callbacks call
        if (this.cache.cont.contains(e.target as Element) || this.dragging) {
            this.callOnFinish();
        }

        this.dragging = false;
    }

    private static removeClass(element: HTMLElement, className: string): void {
        if (element && element.classList) {
            element.classList.remove(className);
        }
    }

    /**
     * Mousedown or touchstart
     * only for handlers
     */
    private pointerDown(target: string | null, e: MouseEvent | TouchEvent): void {
        e.preventDefault();
        const x = Slider.getX(e);
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

        this.coords.x.gap = Slider.getOffset(this.cache.rs).left;
        this.coords.x.pointer = x - this.coords.x.gap;

        this.calcPointerPercent();
        this.changeLevel(target);

        Slider.trigger("focus", this.cache.line);

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
        this.cache.line.focus();
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
        this.coords.x.gap = Slider.getOffset(this.cache.rs).left;
        this.coords.x.pointer = +(x - this.coords.x.gap).toFixed();

        this.forceRedraw = true;
        this.calc();

        Slider.trigger("focus", this.cache.line);
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

        this.coords.x.pointer = Slider.toFixed(this.coords.width.rs / 100 * p);
        this.isKey = true;
        this.calc();
    }

    /**
     * Set visibility and content
     * of Min and Max labels
     */
    private setMinMax(): void {
        if (!this.configuration) {
            return;
        }

        if (this.configuration.hideMinMax) {
            this.cache.min.style.display = "none";
            this.cache.max.style.display = "none";
            return;
        }

        if (this.configuration.values.length) {
            this.cache.min.innerHTML = this.decorate(this.configuration.prettyValues[this.configuration.min]);
            this.cache.max.innerHTML = this.decorate(this.configuration.prettyValues[this.configuration.max]);
        } else {
            const minPretty = this.prettify(this.configuration.min);
            const maxPretty = this.prettify(this.configuration.max);

            this.result.minPretty = minPretty;
            this.result.maxPretty = maxPretty;

            this.cache.min.innerHTML = this.decorate(minPretty, this.configuration.min);
            this.cache.max.innerHTML = this.decorate(maxPretty, this.configuration.max);
        }

        this.labels.width.min = Slider.outerWidth(this.cache.min);
        this.labels.width.max = Slider.outerWidth(this.cache.max);
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
        const interval = this.result.to - this.result.from;

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
            this.coords.width.rs = Slider.outerWidth(this.cache.rs, false);

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

                handleX = Slider.toFixed(handleX + (this.coords.percents.handle * 0.001));

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
            this.coords.percents.barX = (this.coords.percents.handle / 2);
            this.coords.percents.barW = this.coords.percents.singleFake;

            this.result.fromPercent = this.coords.percents.singleReal;
            this.result.from = this.convertToValue(this.coords.percents.singleReal);
            this.result.fromPretty = this.prettify(this.result.from);

            if (this.configuration.values.length) {
                this.result.fromValue = this.configuration.values[this.result.from];
            }
        } else {
            this.coords.percents.barX = Slider.toFixed(this.coords.percents.fromFake + (this.coords.percents.handle / 2));
            this.coords.percents.barW = Slider.toFixed(this.coords.percents.toFake - this.coords.percents.fromFake);

            this.result.fromPercent = this.coords.percents.fromReal;
            this.result.from = this.convertToValue(this.coords.percents.fromReal);
            this.result.fromPretty = this.prettify(this.result.from);
            this.result.toPercent = this.coords.percents.toReal;
            this.result.to = this.convertToValue(this.coords.percents.toReal);
            this.result.toPretty = this.prettify(this.result.to);

            if (this.configuration.values.length) {
                this.result.fromValue = this.configuration.values[this.result.from];
                this.result.toValue = this.configuration.values[this.result.to];
            }
        }

        this.calcMinMax();
        this.calcLabels();
    }

    private calcForBaseTarget() {
        const w = (this.configuration.max - this.configuration.min) / 100,
            f = (this.result.from - this.configuration.min) / w,
            t = (this.result.to - this.configuration.min) / w;

        this.coords.percents.singleReal = Slider.toFixed(f);
        this.coords.percents.fromReal = Slider.toFixed(f);
        this.coords.percents.toReal = Slider.toFixed(t);

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

        const from = this.result.fromPercent,
            to = this.result.toPercent,
            full = to - from,
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

        this.coords.percents.pointer = Slider.toFixed(this.coords.x.pointer / this.coords.width.rs * 100);
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
        const max = 100 - this.coords.percents.handle;
        let x = Slider.toFixed(this.coords.percents.pointer - this.coords.percents.gap);

        if (x < 0) {
            x = 0;
        } else if (x > max) {
            x = max;
        }

        return x;
    }

    private calcHandlePercent(): void {
        if (this.configuration.type === "single") {
            this.coords.width.handle = Slider.outerWidth(this.cache.spanSingle, false);
        } else {
            this.coords.width.handle = Slider.outerWidth(this.cache.spanFrom, false);
        }

        this.coords.percents.handle = Slider.toFixed(this.coords.width.handle / this.coords.width.rs * 100);
    }

    /**
     * Find closest handle to pointer click
     */
    private chooseHandle(realX: number): string {
        if (this.configuration.type === "single") {
            return "single";
        } else {
            const mousePoint = this.coords.percents.fromReal + ((this.coords.percents.toReal - this.coords.percents.fromReal) / 2);
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
            this.labels.width.single = Slider.outerWidth(this.cache.single, false);
            this.labels.percents.singleFake = this.labels.width.single / this.coords.width.rs * 100;
            this.labels.percents.singleLeft = this.coords.percents.singleFake + (this.coords.percents.handle / 2) - (this.labels.percents.singleFake / 2);
            this.labels.percents.singleLeft = this.checkEdges(this.labels.percents.singleLeft, this.labels.percents.singleFake);
        } else {
            this.labels.width.from = Slider.outerWidth(this.cache.from, false);
            this.labels.percents.fromFake = this.labels.width.from / this.coords.width.rs * 100;
            this.labels.percents.fromLeft = this.coords.percents.fromFake + (this.coords.percents.handle / 2) - (this.labels.percents.fromFake / 2);
            this.labels.percents.fromLeft = Slider.toFixed(this.labels.percents.fromLeft);
            this.labels.percents.fromLeft = this.checkEdges(this.labels.percents.fromLeft, this.labels.percents.fromFake);

            this.labels.width.to = Slider.outerWidth(this.cache.to, false);
            this.labels.percents.toFake = this.labels.width.to / this.coords.width.rs * 100;
            this.labels.percents.toLeft = this.coords.percents.toFake + (this.coords.percents.handle / 2) - (this.labels.percents.toFake / 2);
            this.labels.percents.toLeft = Slider.toFixed(this.labels.percents.toLeft);
            this.labels.percents.toLeft = this.checkEdges(this.labels.percents.toLeft, this.labels.percents.toFake);

            this.labels.width.single = Slider.outerWidth(this.cache.single, false);
            this.labels.percents.singleFake = this.labels.width.single / this.coords.width.rs * 100;
            this.labels.percents.singleLeft = ((this.labels.percents.fromLeft + this.labels.percents.toLeft + this.labels.percents.toFake) / 2) - (this.labels.percents.singleFake / 2);
            this.labels.percents.singleLeft = Slider.toFixed(this.labels.percents.singleLeft);
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
        this.coords.width.rs = Slider.outerWidth(this.cache.rs, false);

        if (!this.coords.width.rs) {
            return;
        }

        if (this.coords.width.rs !== this.coords.width.oldRs) {
            this.target = "base";
            this.isResize = true;
        }

        if (this.coords.width.rs !== this.coords.width.oldRs || this.forceRedraw) {
            this.setMinMax();
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

        if (this.previousResultFrom !== this.result.from || this.previousResultTo !== this.result.to || this.forceRedraw || this.isKey) {

            this.drawLabels();

            this.cache.bar.style.left = this.coords.percents.barX.toString(10) + "%";
            this.cache.bar.style.width = this.coords.percents.barW.toString(10) + "%";

            if (this.configuration.type === "single") {
                this.cache.bar.style.left = "0";
                this.cache.bar.style.width = this.coords.percents.barW.toString(10) + this.coords.percents.barX.toString(10) + "%";

                this.cache.spanSingle.style.left = this.coords.percents.singleFake.toString(10) + "%";

                this.cache.single.style.left = this.labels.percents.singleLeft.toString(10) + "%";
            } else {
                this.cache.spanFrom.style.left = this.coords.percents.fromFake.toString(10) + "%";
                this.cache.spanTo.style.left = this.coords.percents.toFake.toString(10) + "%";

                if (this.previousResultFrom !== this.result.from || this.forceRedraw) {
                    this.cache.from.style.left = this.labels.percents.fromLeft.toString(10) + "%";
                }
                if (this.previousResultTo !== this.result.to || this.forceRedraw) {
                    this.cache.to.style.left = this.labels.percents.toLeft.toString(10) + "%";
                }

                this.cache.single.style.left = this.labels.percents.singleLeft.toString(10) + "%";
            }

            this.writeToInput();

            if ((this.previousResultFrom !== this.result.from || this.previousResultTo !== this.result.to) && !this.isStart) {
                // Override this event in component
                // this.trigger('change', this.cache.input);
                Slider.trigger("input", this.cache.input);
            }

            this.previousResultFrom = this.result.from;
            this.previousResultTo = this.result.to;

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

        const valuesLength = this.configuration.values.length;
        const pValues = this.configuration.prettyValues;
        let singleText: string,
            fromText: string,
            toText: string,
            prettyFrom: string,
            prettyTo: string;

        if (this.configuration.hideFromTo) {
            return;
        }

        if (this.configuration.type === "single") {

            if (valuesLength) {
                singleText = this.decorate(pValues[this.result.from]);
                this.cache.single.innerHTML = singleText;
            } else {
                prettyFrom = this.prettify(this.result.from);

                singleText = this.decorate(prettyFrom, this.result.from);
                this.cache.single.innerHTML = singleText;
            }

            this.calcLabels();

            if (this.labels.percents.singleLeft < this.labels.percents.min + 1) {
                this.cache.min.style.visibility = "hidden";
            } else {
                this.cache.min.style.visibility = "visible";
            }

            if (this.labels.percents.singleLeft + this.labels.percents.singleFake > 100 - this.labels.percents.max - 1) {
                this.cache.max.style.visibility = "hidden";
            } else {
                this.cache.max.style.visibility = "visible";
            }

        } else {
            if (valuesLength) {

                if (this.configuration.decorateBoth) {
                    singleText = this.decorate(pValues[this.result.from]);
                    singleText += this.configuration.valuesSeparator;
                    singleText += this.decorate(pValues[this.result.to]);
                } else {
                    singleText = this.decorate(`${pValues[this.result.from]}${this.configuration.valuesSeparator}${pValues[this.result.to]}`);
                }
                fromText = this.decorate(pValues[this.result.from]);
                toText = this.decorate(pValues[this.result.to]);


                this.cache.single.innerHTML = singleText;
                this.cache.from.innerHTML = fromText;
                this.cache.to.innerHTML = toText;

            } else {
                prettyFrom = this.prettify(this.result.from);
                prettyTo = this.prettify(this.result.to);

                if (this.configuration.decorateBoth) {
                    singleText = this.decorate(prettyFrom, this.result.from);
                    singleText += this.configuration.valuesSeparator;
                    singleText += this.decorate(prettyTo, this.result.to);
                } else {
                    singleText = this.decorate(prettyFrom + this.configuration.valuesSeparator + prettyTo, this.result.to);
                }
                fromText = this.decorate(prettyFrom, this.result.from);
                toText = this.decorate(prettyTo, this.result.to);

                this.cache.single.innerHTML = singleText;
                this.cache.from.innerHTML = fromText;
                this.cache.to.innerHTML = toText;
            }

            this.calcLabels();

            const min = Math.min(this.labels.percents.singleLeft, this.labels.percents.fromLeft),
                singleLeft = this.labels.percents.singleLeft + this.labels.percents.singleFake,
                toLeft = this.labels.percents.toLeft + this.labels.percents.toFake;
            let max = Math.max(singleLeft, toLeft);

            if (this.labels.percents.fromLeft + this.labels.percents.fromFake >= this.labels.percents.toLeft) {
                this.cache.from.style.visibility = "hidden";
                this.cache.to.style.visibility = "hidden";
                this.cache.single.style.visibility = "visible";

                if (this.result.from === this.result.to) {
                    if (this.target === "from") {
                        this.cache.from.style.visibility = "visible";
                    } else if (this.target === "to") {
                        this.cache.to.style.visibility = "visible";
                    } else if (!this.target) {
                        this.cache.from.style.visibility = "visible";
                    }
                    this.cache.single.style.visibility = "hidden";
                    max = toLeft;
                } else {
                    this.cache.from.style.visibility = "hidden";
                    this.cache.to.style.visibility = "hidden";
                    this.cache.single.style.visibility = "visible";
                    max = Math.max(singleLeft, toLeft);
                }
            } else {
                this.cache.from.style.visibility = "visible";
                this.cache.to.style.visibility = "visible";
                this.cache.single.style.visibility = "hidden";
            }

            if (min < this.labels.percents.min + 1) {
                this.cache.min.style.visibility = "hidden";
            } else {
                this.cache.min.style.visibility = "visible";
            }

            if (max > 100 - this.labels.percents.max - 1) {
                this.cache.max.style.visibility = "hidden";
            } else {
                this.cache.max.style.visibility = "visible";
            }

        }
    }

    /**
     * Draw shadow intervals
     */
    private drawShadow(): void {
        const o = this.configuration,
            c = this.cache,

            isFromMin = typeof o.fromMin === "number" && !isNaN(o.fromMin),
            isFromMax = typeof o.fromMax === "number" && !isNaN(o.fromMax),
            isToMin = typeof o.toMin === "number" && !isNaN(o.toMin),
            isToMax = typeof o.toMax === "number" && !isNaN(o.toMax);

        let fromMin: number,
            fromMax: number,
            toMin: number,
            toMax: number;

        if (o.type === "single") {
            if (o.fromShadow && (isFromMin || isFromMax)) {
                fromMin = this.convertToPercent(isFromMin ? o.fromMin : o.min);
                fromMax = this.convertToPercent(isFromMax ? o.fromMax : o.max) - fromMin;
                fromMin = Slider.toFixed(fromMin - (this.coords.percents.handle / 100 * fromMin));
                fromMax = Slider.toFixed(fromMax - (this.coords.percents.handle / 100 * fromMax));
                fromMin = fromMin + (this.coords.percents.handle / 2);

                c.shadowSingle.style.display = "block";
                c.shadowSingle.style.left = fromMin.toString(10) + "%";
                c.shadowSingle.style.width = fromMax.toString(10) + "%";
            } else {
                c.shadowSingle.style.display = "none";
            }
        } else {
            if (o.fromShadow && (isFromMin || isFromMax)) {
                fromMin = this.convertToPercent(isFromMin ? o.fromMin : o.min);
                fromMax = this.convertToPercent(isFromMax ? o.fromMax : o.max) - fromMin;
                fromMin = Slider.toFixed(fromMin - (this.coords.percents.handle / 100 * fromMin));
                fromMax = Slider.toFixed(fromMax - (this.coords.percents.handle / 100 * fromMax));
                fromMin = fromMin + (this.coords.percents.handle / 2);

                c.shadowFrom.style.display = "block";
                c.shadowFrom.style.left = fromMin.toString(10) + "%";
                c.shadowFrom.style.width = fromMax.toString(10) + "%";
            } else {
                c.shadowFrom.style.display = "none";
            }

            if (o.toShadow && (isToMin || isToMax)) {
                toMin = this.convertToPercent(isToMin ? o.toMin : o.min);
                toMax = this.convertToPercent(isToMax ? o.toMax : o.max) - toMin;
                toMin = Slider.toFixed(toMin - (this.coords.percents.handle / 100 * toMin));
                toMax = Slider.toFixed(toMax - (this.coords.percents.handle / 100 * toMax));
                toMin = toMin + (this.coords.percents.handle / 2);

                c.shadowTo.style.display = "block";
                c.shadowTo.style.left = toMin.toString(10) + "%";
                c.shadowTo.style.width = toMax.toString(10) + "%";
            } else {
                c.shadowTo.style.display = "none";
            }
        }
    }

    /**
     * Write values to input element
     */
    private writeToInput(): void {
        if (this.configuration.type === "single") {
            if (this.configuration.values.length) {
                this.cache.input.value = typeof this.result.fromValue === "number" ? this.result.fromValue.toString(10) : this.result.fromValue;
            } else {
                this.cache.input.value = this.result.from.toString(10);
            }
            this.cache.input.dataset.from = this.result.from.toString(10);
        } else {
            if (this.configuration.values.length) {
                this.cache.input.value = `${this.result.fromValue}${this.configuration.inputValuesSeparator}${this.result.toValue}`;
            } else {
                this.cache.input.value = `${this.result.from}${this.configuration.inputValuesSeparator}${this.result.to}`;
            }
            this.cache.input.dataset.from = this.result.from.toString(10);
            this.cache.input.dataset.to = this.result.to.toString(10);
        }
    }

    // =============================================================================================================
    // Callbacks
    // =============================================================================================================

    private callOnStart(): void {
        this.writeToInput();

        if (this.configuration.onStart && typeof this.configuration.onStart === "function") {
            if (this.configuration.callbackScope) {
                this.configuration.onStart.call(this.configuration.callbackScope, this.result);
            } else {
                this.configuration.onStart(this.result);
            }
        }
    }

    private callOnChange(): void {
        this.writeToInput();

        if (this.configuration.onChange && typeof this.configuration.onChange === "function") {
            if (this.configuration.callbackScope) {
                this.configuration.onChange.call(this.configuration.callbackScope, this.result);
            } else {
                this.configuration.onChange(this.result);
            }
        }
    }

    private callOnFinish(): void {
        this.writeToInput();

        if (this.configuration.onFinish && typeof this.configuration.onFinish === "function") {
            if (this.configuration.callbackScope) {
                this.configuration.onFinish.call(this.configuration.callbackScope, this.result);
            } else {
                this.configuration.onFinish(this.result);
            }
        }
    }

    private callOnUpdate(): void {
        this.writeToInput();

        if (this.configuration.onUpdate && typeof this.configuration.onUpdate === "function") {
            if (this.configuration.callbackScope) {
                this.configuration.onUpdate.call(this.configuration.callbackScope, this.result);
            } else {
                this.configuration.onUpdate(this.result);
            }
        }
    }

    // =============================================================================================================
    // Service methods
    // =============================================================================================================

    private toggleInput(): void {
        this.cache.input.classList.toggle("irs-hidden-input");

        if (this.hasTabIndex) {
            this.cache.input.tabIndex = -1;
        } else {
            this.cache.input.removeAttribute("tabindex");
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

        return Slider.toFixed(val / onePercent);
    }

    /**
     * Convert percent to real values
     */
    private convertToValue(percent: number): number {
        let min = this.configuration.min,
            max = this.configuration.max,
            minLength: number, maxLength: number,
            avgDecimals = 0,
            abs = 0;

        const minDecimals = min.toString().split(".")[1],
            maxDecimals = max.toString().split(".")[1];

        if (percent === 0) {
            return this.configuration.min;
        }
        if (percent === 100) {
            return this.configuration.max;
        }


        if (minDecimals) {
            minLength = minDecimals.length;
            avgDecimals = minLength;
        }
        if (maxDecimals) {
            maxLength = maxDecimals.length;
            avgDecimals = maxLength;
        }
        if (minLength && maxLength) {
            avgDecimals = (minLength >= maxLength) ? minLength : maxLength;
        }

        if (min < 0) {
            abs = Math.abs(min);
            min = +(min + abs).toFixed(avgDecimals);
            max = +(max + abs).toFixed(avgDecimals);
        }

        let number = ((max - min) / 100 * percent) + min,
            result: number;
        const string = this.configuration.step.toString().split(".")[1];

        if (string) {
            number = +number.toFixed(string.length);
        } else {
            number = number / this.configuration.step;
            number = number * this.configuration.step;

            number = +number.toFixed(0);
        }

        if (abs) {
            number -= abs;
        }

        if (string) {
            result = +number.toFixed(string.length);
        } else {
            result = Slider.toFixed(number);
        }

        if (result < this.configuration.min) {
            result = this.configuration.min;
        } else if (result > this.configuration.max) {
            result = this.configuration.max;
        }

        return result;
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

        return Slider.toFixed(rounded);
    }

    private checkMinInterval(currentPercent: number, nextPercent: number, type): number {
        if (!this.configuration.minInterval) {
            return currentPercent;
        }

        let current: number = this.convertToValue(currentPercent);
        const next = this.convertToValue(nextPercent);

        if (type === "from") {

            if (next - current < this.configuration.minInterval) {
                current = next - this.configuration.minInterval;
            }

        } else {

            if (current - next < this.configuration.minInterval) {
                current = next + this.configuration.minInterval;
            }

        }

        return this.convertToPercent(current);
    }

    private checkMaxInterval(currentPercent: number, nextPercent: number, type): number {
        if (!this.configuration.maxInterval) {
            return currentPercent;
        }

        let current:number = this.convertToValue(currentPercent);
        const next = this.convertToValue(nextPercent);

        if (type === "from") {

            if (next - current > this.configuration.maxInterval) {
                current = next - this.configuration.maxInterval;
            }
        } else {

            if (current - next > this.configuration.maxInterval) {
                current = next + this.configuration.maxInterval;
            }
        }

        return this.convertToPercent(current);
    }

    private checkDiapason(numberPercent: number, min: number, max: number) {
        let num = this.convertToValue(numberPercent);

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

    private static toFixed(num: number): number {
        return parseFloat(num.toFixed(20));
    }

    private checkEdges(left: number, width: number): number {
        if (!this.configuration.forceEdges) {
            return Slider.toFixed(left);
        }

        if (left < 0) {
            left = 0;
        } else if (left > 100 - width) {
            left = 100 - width;
        }

        return Slider.toFixed(left);
    }

    private decorate(num: number | string, original?: number): string {
        let decorated = "";
        const o = this.configuration;

        if (o.prefix) {
            decorated += o.prefix;
        }

        decorated += num;

        if (o.maxPostfix) {
            if (o.values.length && num === o.prettyValues[o.max]) {
                decorated += o.maxPostfix;
                if (o.postfix) {
                    decorated += " ";
                }
            } else if (original === o.max) {
                decorated += o.maxPostfix;
                if (o.postfix) {
                    decorated += " ";
                }
            }
        }

        if (o.postfix) {
            decorated += o.postfix;
        }

        return decorated;
    }

    private updateFrom(): void {
        this.result.from = this.configuration.from;
        this.result.fromPercent = this.convertToPercent(this.result.from);
        this.result.fromPretty = this.prettify(this.result.from);
        if (this.configuration.values) {
            this.result.fromValue = this.configuration.values[this.result.from];
        }
    }

    private updateTo(): void {
        this.result.to = this.configuration.to;
        this.result.toPercent = this.convertToPercent(this.result.to);
        this.result.toPretty = this.prettify(this.result.to);
        if (this.configuration.values) {
            this.result.toValue = this.configuration.values[this.result.to];
        }
    }

    private updateResult(): void {
        this.result.min = this.configuration.min;
        this.result.max = this.configuration.max;
        this.updateFrom();
        this.updateTo();
    }

    // =============================================================================================================
    // Grid
    // =============================================================================================================

    private appendGrid(): void {
        if (!this.configuration.grid) {
            return;
        }

        const o = this.configuration,

            total = o.max - o.min;

        let gridNum = o.gridNum,
            smallMax = 4,
            bigW = 0,
            smallW = 0,
            html = "",
            result: number | string;


        this.calcGridMargin();

        if (o.gridSnap) {
            gridNum = total / o.step;
        }

        if (gridNum > 50) gridNum = 50;
        const bigP = Slider.toFixed(100 / gridNum);

        if (gridNum > 4) {
            smallMax = 3;
        }
        if (gridNum > 7) {
            smallMax = 2;
        }
        if (gridNum > 14) {
            smallMax = 1;
        }
        if (gridNum > 28) {
            smallMax = 0;
        }

        for (let i = 0; i < gridNum + 1; i++) {
            const localSmallMax = smallMax;

            bigW = Slider.toFixed(bigP * i);

            if (bigW > 100) {
                bigW = 100;
            }
            this.coords.big[i] = bigW;

            const smallP = (bigW - (bigP * (i - 1))) / (localSmallMax + 1);

            for (let z = 1; z <= localSmallMax; z++) {
                if (bigW === 0) {
                    break;
                }

                smallW = Slider.toFixed(bigW - (smallP * z));

                html += `<span class="irs-grid-pol small" style="left: ${smallW}%"></span>`;
            }

            html +=`<span class="irs-grid-pol" style="left: ${bigW}%"></span>`;

            result = this.convertToValue(bigW);
            if (o.values.length) {
                result = o.prettyValues[result];
            } else {
                result = this.prettify(result);
            }

            html += `<span class="irs-grid-text js-grid-text-${i}" style="left: ${bigW}%">${result}</span>`
        }
        this.coords.bigNum = Math.ceil(gridNum + 1);


        this.cache.cont.classList.toggle("irs-with-grid");
        this.cache.grid.innerHTML = html;
        this.cacheGridLabels();
    }

    private cacheGridLabels(): void {
        for (let i = 0; i < this.coords.bigNum; i++) {
            const label = this.cache.grid.querySelector(`.js-grid-text-${i}`);
            if (!label) {
                continue;
            }
            this.cache.gridLabels.push(label as HTMLHtmlElement);
        }

        this.calcGridLabels();
    }

    private calcGridLabels(): void {
        const start: number[] = [], finish: number[] = [], num = this.coords.bigNum;
        for (let i = 0; i < num; i++) {
            this.coords.bigW[i] = Slider.outerWidth(this.cache.gridLabels[i], false);
            this.coords.bigP[i] = Slider.toFixed(this.coords.bigW[i] / this.coords.width.rs * 100);
            this.coords.bigX[i] = Slider.toFixed(this.coords.bigP[i] / 2);

            start[i] = Slider.toFixed(this.coords.big[i] - this.coords.bigX[i]);
            finish[i] = Slider.toFixed(start[i] + this.coords.bigP[i]);
        }

        if (this.configuration.forceEdges) {
            if (start[0] < -this.coords.gridGap) {
                start[0] = -this.coords.gridGap;
                finish[0] = Slider.toFixed(start[0] + this.coords.bigP[0]);

                this.coords.bigX[0] = this.coords.gridGap;
            }

            if (finish[num - 1] > 100 + this.coords.gridGap) {
                finish[num - 1] = 100 + this.coords.gridGap;
                start[num - 1] = Slider.toFixed(finish[num - 1] - this.coords.bigP[num - 1]);

                this.coords.bigX[num - 1] = Slider.toFixed(this.coords.bigP[num - 1] - this.coords.gridGap);
            }
        }

        this.calcGridCollision(2, start, finish);
        this.calcGridCollision(4, start, finish);

        for (let i = 0; i < num; i++) {
            const label = this.cache.gridLabels[i];

            if (this.coords.bigX[i] !== Number.POSITIVE_INFINITY) {
                label.style.marginLeft = `${-this.coords.bigX[i]}%`;
            }
        }
    }

    private calcGridCollision(step, start: number[], finish: number[]): void {
        let nextIndex: number;
        const num = this.coords.bigNum;

        for (let i = 0; i < num; i += step) {
            nextIndex = i + (step / 2);
            if (nextIndex >= num) {
                break;
            }

            const label = this.cache.gridLabels[nextIndex];

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

        this.coords.width.rs = Slider.outerWidth(this.cache.rs, false);
        if (!this.coords.width.rs) {
            return;
        }

        if (this.configuration.type === "single") {
            this.coords.width.handle = Slider.outerWidth(this.cache.spanSingle, false);
        } else {
            this.coords.width.handle = Slider.outerWidth(this.cache.spanFrom, false);
        }
        this.coords.percents.handle = Slider.toFixed(this.coords.width.handle / this.coords.width.rs * 100);
        this.coords.gridGap = Slider.toFixed((this.coords.percents.handle / 2) - 0.1);

        this.cache.grid.style.width = `${Slider.toFixed(100 - this.coords.percents.handle)}%`;
        this.cache.grid.style.left = `${this.coords.gridGap}%`;
    }

    private prettify(value: number): string {
        return RangeSliderConfigurationUtil.prettify(this.configuration, value);
    }

    // =============================================================================================================
    // Public methods
    // =============================================================================================================

    update(options?: Partial<IRangeSliderConfiguration>): void {
        if (!this.input) {
            return;
        }

        this.isUpdate = true;

        this.configuration.from = this.result.from;
        this.configuration.to = this.result.to;
        this.updateCheck = {from: this.result.from, to: this.result.to};

        // this.configuration = Object.assign({}, this.configuration, options);
        this.configuration = RangeSliderConfigurationUtil.mergeConfigurations(this.configuration, options, this.updateCheck);
        this.updateResult();

        this.toggleInput();
        this.remove();
        this.init(true);
    }

    reset(): void {
        if (!this.input) {
            return;
        }

        this.updateResult();
        this.update();
    }

    destroy(): void {
        if (!this.input) {
            return;
        }

        this.toggleInput();
        this.cache.input.readOnly = false;
        // this.input.dataset.ionRangeSlider = null;

        this.remove();
        this.input = undefined;
        this.configuration = undefined;
    }

    private unbindEvents(): void {
        if (this.noDiapason) {
            return;
        }

        this.cache.body.removeEventListener("touchmove", (e: TouchEvent) => this.pointerMove(e));
        this.cache.body.removeEventListener("mousemove", (e: MouseEvent) => this.pointerMove(e));
        this.cache.win.removeEventListener("touchend", (e: TouchEvent) => this.pointerUp(e));
        this.cache.win.removeEventListener("mouseup", (e: MouseEvent) => this.pointerUp(e));
        this.cache.line.removeEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));
        this.cache.line.removeEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
        this.cache.line.removeEventListener("focus", () => this.pointerFocus());

        if (this.configuration.dragInterval && this.configuration.type === "double") {
            this.cache.bar.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown("both", e));
            this.cache.bar.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown("both", e));
        } else {
            this.cache.bar.removeEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));
            this.cache.bar.removeEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
        }

        if (this.configuration.type === "single") {
            this.cache.single.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown("single", e));
            this.cache.spanSingle.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown("single", e));
            this.cache.shadowSingle.removeEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));

            this.cache.single.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown("single", e));
            this.cache.spanSingle.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown("single", e));
            this.cache.shadowSingle.removeEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));

            if (this.cache.edge) {
                this.cache.edge.removeEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
            }
        } else {
            this.cache.single.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown(null, e));
            this.cache.single.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown(null, e));

            this.cache.from.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown("from", e));
            this.cache.spanFrom.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown("from", e));
            this.cache.to.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown("to", e));
            this.cache.spanTo.removeEventListener("touchstart", (e: TouchEvent) => this.pointerDown("to", e));
            this.cache.shadowFrom.removeEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));
            this.cache.shadowTo.removeEventListener("touchstart", (e: TouchEvent) => this.pointerClick("click", e));

            this.cache.from.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown("from", e));
            this.cache.spanFrom.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown("from", e));
            this.cache.to.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown("to", e));
            this.cache.spanTo.removeEventListener("mousedown", (e: MouseEvent) => this.pointerDown("to", e));
            this.cache.shadowFrom.removeEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
            this.cache.shadowTo.removeEventListener("mousedown", (e: MouseEvent) => this.pointerClick("click", e));
        }

        if (this.configuration.keyboard) {
            this.cache.line.removeEventListener("keydown", (e: KeyboardEvent) => this.key(e));
        }

        if (Slider.getIsOldIe()) {
            this.cache.body.removeEventListener("mouseup", (e: MouseEvent) => this.pointerUp(e));
            this.cache.body.removeEventListener("mouseleave", (e: MouseEvent) => this.pointerUp(e));
        }
    }
}
