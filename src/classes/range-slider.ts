import {RangeSliderDOM} from "./range-slider-dom";
import {RangeSliderUtil} from "./range-slider-util";
import {IRangeSliderOptions} from "../interfaces/range-slider-options";
import {RangeSliderEvent} from "./range-slider-event";
import {CallbackType, EventType, RangeSliderElement, SliderType, TargetType} from "../enums";
import {RangeSliderState} from "./range-slider-state";
import {EventBus} from "./range-slider-event-bus";
import {IRangeSlider} from "../interfaces/range-slider";

export class RangeSlider implements IRangeSlider {
    private static currentPluginCount = 0;

    private configuration: IRangeSliderOptions<number>;
    private state: RangeSliderState;
    private domElement: RangeSliderDOM;
    private eventBus = new EventBus();
    private readonly pluginCount: number;

    private calcCount = 0;
    private updateTimeoutId?: number;
    private previousResultFrom = 0;
    private previousResultTo = 0;
    private previousMinInterval?: number;
    private rafId?: number;

    private forceRedraw = false;
    private hasTabIndex = true;
    private isKey = false;
    private isUpdate = false;
    private isStart = true;
    private isActive = false;
    private isResize = false;
    private isClick = false;

    private currentPosition: number; // coords.x.pointer
    private previousRangeSliderWidth: number; // coords.width.oldRs
    private gapBetweenPointerAndHandle: number; // coords.percents.gap
    private singleHandleAsPercent: number; //singleReal
    private fromHandleAsPercent: number; //fromReal
    private toHandleAsPercent: number; //toReal

    private target?: TargetType;

    private _pointerFocus = () => this.pointerFocus();

    private static getCurrentPluginCount() {
        return RangeSlider.currentPluginCount++;
    }

    // =================================================================================================================
    // Core
    // =================================================================================================================

    constructor(inputElement: HTMLInputElement, options: Partial<IRangeSliderOptions<number | string>>) {
        this.eventBus.on(EventType.move, ((event: CustomEvent<{ x: number }>) => this.pointerMove(event.detail.x)));
        this.eventBus.on(EventType.down, ((event: CustomEvent<{ target?: TargetType; x: number }>) => this.pointerDown(event.detail.target, event.detail.x)));
        this.eventBus.on(EventType.up, ((event: CustomEvent<{ eventTarget: EventTarget }>) => this.pointerUp(event.detail.eventTarget)));
        this.eventBus.on(EventType.click, ((event: CustomEvent<{ target: TargetType; x: number }>) => this.updateXPosition(event.detail.target, event.detail.x)));
        this.eventBus.on(EventType.keyDown, ((event: CustomEvent<{ keyCode: string }>) => this.moveByKey(event.detail.keyCode)))

        if (!inputElement) {
            throw Error("Given input element does not exist");
        }
        this.pluginCount = RangeSlider.getCurrentPluginCount();

        options = options || {};

        //Todo récupérer les data de l'input pour initialiser la config'

        if (inputElement.nodeName !== "INPUT") {
            throw Error("Base element should be <input>!");
        }

        this.configuration = RangeSliderUtil.initializeConfiguration(options, inputElement.value);

        this.state = new RangeSliderState(this.configuration);

        this.domElement = new RangeSliderDOM(inputElement, this.configuration, this.pluginCount, this.state, this.eventBus);

        this.domElement.addEventListener(this.configuration.type, this.configuration.dragInterval, this.configuration.keyboard, this._pointerFocus);

        if (this.configuration.type === SliderType.single) {
            this.singleHandleAsPercent = this.state.convertToPercent(this.configuration.from);
        } else {
            this.fromHandleAsPercent = this.state.convertToPercent(this.configuration.from);
            this.toHandleAsPercent = this.state.convertToPercent(this.configuration.to);
        }

        this.execute(CallbackType.onStart);
    }

    private execute(callback: CallbackType): void {
        this.target = TargetType.base;
        this.toggleInput();

        this.forceRedraw = true;
        this.calc(true);
        this.callback(callback);

        this.updateScene();
    }

    private addHoverState(target: TargetType): void {
        switch (target) {
            case TargetType.single:
                this.gapBetweenPointerAndHandle = RangeSliderUtil.toFixed(this.getPointerAsPercent() - this.convertToFakePercent(this.singleHandleAsPercent));
                this.domElement.getElement(RangeSliderElement.spanSingle).classList.add("state_hover");
                break;
            case TargetType.from:
                this.gapBetweenPointerAndHandle = RangeSliderUtil.toFixed(this.getPointerAsPercent() - this.convertToFakePercent(this.fromHandleAsPercent));
                this.domElement.getElement(RangeSliderElement.spanFrom).classList.add("state_hover");
                this.domElement.getElement(RangeSliderElement.spanFrom).classList.add("type_last");
                this.domElement.getElement(RangeSliderElement.spanTo).classList.remove("type_last");
                break;
            case TargetType.to:
                this.gapBetweenPointerAndHandle = RangeSliderUtil.toFixed(this.getPointerAsPercent() - this.convertToFakePercent(this.toHandleAsPercent));
                this.domElement.getElement(RangeSliderElement.spanTo).classList.add("state_hover");
                this.domElement.getElement(RangeSliderElement.spanTo).classList.add("type_last");
                this.domElement.getElement(RangeSliderElement.spanFrom).classList.remove("type_last");
                break;
            case TargetType.both:
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

        this.domElement.removeEventListener(this.configuration.type, this.configuration.dragInterval, this.configuration.keyboard, this._pointerFocus);

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
            const handle = this.configuration.type === SliderType.single ?
                this.domElement.getElement(RangeSliderElement.spanSingle) :
                this.domElement.getElement(RangeSliderElement.from);

            let x = RangeSlider.getLeftOffset(handle);
            x += handle.offsetWidth / 2 - 1;

            this.updateXPosition(TargetType.single, x);
        }
    }

    private static getLeftOffset(element: Element): number {
        return element.getBoundingClientRect().left + window.scrollX;
    }

    /**
     * Mousemove or touchmove
     * only for handlers
     */
    private pointerMove(xPointer: number) {
        this.currentPosition = xPointer - RangeSlider.getLeftOffset(this.domElement.getElement(RangeSliderElement.rangeSlider));

        this.calc();
    }

    private pointerUp(eventTarget: EventTarget): void {
        if (this.isActive) {
            this.isActive = false;
        } else {
            return;
        }

        this.domElement.removeHoverState();

        this.forceRedraw = true;

        this.updateScene();
        this.restoreOriginalMinInterval();

        if (this.domElement.contains(eventTarget as Element)) {
            this.callback(CallbackType.onFinish);
        }
    }

    private pointerDown(target: TargetType, x: number): void {
        if (target === TargetType.both) {
            this.setTempMinInterval();
        }

        if (!target) {
            target = this.target || TargetType.from;
        }

        this.target = target;

        this.isActive = true;

        const gap = RangeSlider.getLeftOffset(this.domElement.getElement(RangeSliderElement.rangeSlider));
        this.currentPosition = x - gap;

        this.calcPointerPercent();
        this.addHoverState(target);

        RangeSlider.trigger("focus", this.domElement.getElement(RangeSliderElement.line));

        this.updateScene();
    }

    private updateXPosition(target: TargetType, x: number) {
        this.target = target;

        this.isClick = true;
        const gap = RangeSlider.getLeftOffset(this.domElement.getElement(RangeSliderElement.rangeSlider));

        this.currentPosition = RangeSliderUtil.toFixed(x - gap, 0);

        this.forceRedraw = true;

        this.calc();

        RangeSlider.trigger("focus", this.domElement.getElement(RangeSliderElement.line));
    }

    private static trigger(type: string, element: Element) {
        const evt = new Event(type, {bubbles: true, cancelable: true})
        element.dispatchEvent(evt);
    }

    /**
     * Move by key
     */
    private moveByKey(keyCode: string): void {
        let p = this.getPointerAsPercent();
        const stepAsPercent = this.state.getStepAsPercent();
        switch (keyCode) {
            case "KeyW": // W
            case "KeyA": // A
            case "ArrowDown": // DOWN
            case "ArrowLeft": // LEFT
                p -= stepAsPercent;
                break;
            case "KeyS": // S
            case "KeyD": // D
            case "ArrowUp": // UP
            case "ArrowRight": // RIGHT
                p += stepAsPercent;
                break;
        }

        this.currentPosition = this.domElement.getElement(RangeSliderElement.rangeSlider).offsetWidth / 100 * p;
        this.isKey = true;
        this.calc();
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

        const rangeSliderWidth = this.domElement.getElement(RangeSliderElement.rangeSlider).offsetWidth;
        if (this.calcCount === 10 || update) {
            this.calcCount = 0;
        }

        if (!rangeSliderWidth) {
            return;
        }

        this.calcPointerPercent();
        let handleX = this.getHandleX();

        if (this.target === TargetType.both) {
            this.gapBetweenPointerAndHandle = 0;
            handleX = this.getHandleX();
        }

        const handleWidthAsPercent = this.domElement.getHandleWidthAsPercent();

        if (this.target === TargetType.click) {
            this.gapBetweenPointerAndHandle = (handleWidthAsPercent / 2);
            handleX = this.getHandleX();

            if (this.configuration.dragInterval) {
                this.target = TargetType.bothOne;
            } else {
                this.target = this.chooseHandle(handleX);
            }
        }

        switch (this.target) {
            case TargetType.base:
                this.setInitialValuesForHandles();
                break;
            case TargetType.single:
                if (this.configuration.fromFixed) {
                    break;
                }

                this.singleHandleAsPercent = this.checkDiapason(this.state.getPercentAccordingToStep(this.convertToRealPercent(handleX)), this.configuration.fromMin, this.configuration.fromMax);
                break;

            case TargetType.from:
                if (this.configuration.fromFixed) {
                    break;
                }

                this.fromHandleAsPercent = this.state.getPercentAccordingToStep(this.convertToRealPercent(handleX));
                if (this.fromHandleAsPercent > this.toHandleAsPercent) {
                    this.fromHandleAsPercent = this.toHandleAsPercent;
                }
                this.fromHandleAsPercent = this.checkDiapason(this.fromHandleAsPercent, this.configuration.fromMin, this.configuration.fromMax);
                this.fromHandleAsPercent = this.checkMinInterval(this.fromHandleAsPercent, this.toHandleAsPercent, TargetType.from);
                this.fromHandleAsPercent = this.checkMaxInterval(this.fromHandleAsPercent, this.toHandleAsPercent, TargetType.from);
                break;

            case TargetType.to:
                if (this.configuration.toFixed) {
                    break;
                }

                this.toHandleAsPercent = this.state.getPercentAccordingToStep(this.convertToRealPercent(handleX));
                if (this.toHandleAsPercent < this.fromHandleAsPercent) {
                    this.toHandleAsPercent = this.fromHandleAsPercent;
                }
                this.toHandleAsPercent = this.checkDiapason(this.toHandleAsPercent, this.configuration.toMin, this.configuration.toMax);
                this.toHandleAsPercent = this.checkMinInterval(this.toHandleAsPercent, this.fromHandleAsPercent, TargetType.to);
                this.toHandleAsPercent = this.checkMaxInterval(this.toHandleAsPercent, this.fromHandleAsPercent, TargetType.to);
                break;

            case TargetType.both:
                if (this.configuration.fromFixed || this.configuration.toFixed) {
                    break;
                }
                this.updateFromAndToHandles(RangeSliderUtil.toFixed(handleX + handleWidthAsPercent * 0.001));

                break;

            case TargetType.bothOne:
                if (this.configuration.fromFixed || this.configuration.toFixed) {
                    break;
                }
                this.calcForBothOneTarget(this.convertToRealPercent(handleX));
                break;
        }
    }

    private updateFromAndToHandles(handleX: number) {
        const gapLeft = RangeSliderUtil.toFixed(this.getPointerAsPercent() - this.convertToFakePercent(this.fromHandleAsPercent)),
            gapRight = RangeSliderUtil.toFixed(this.convertToFakePercent(this.toHandleAsPercent) - this.getPointerAsPercent());

        this.fromHandleAsPercent =
            this.checkMinInterval(
                this.checkDiapason(
                    this.state.getPercentAccordingToStep(
                        this.convertToRealPercent(handleX) - gapLeft),
                    this.configuration.fromMin,
                    this.configuration.fromMax),
                this.toHandleAsPercent,
                TargetType.from);

        this.toHandleAsPercent =
            this.checkMinInterval(
                this.checkDiapason(
                    this.state.getPercentAccordingToStep(
                        this.convertToRealPercent(handleX) + gapRight),
                    this.configuration.toMin,
                    this.configuration.toMax),
                this.fromHandleAsPercent,
                TargetType.to);
    }

    private setInitialValuesForHandles() {
        const w = (this.state.max - this.state.min) / 100,
            f = (this.getFromValue() - this.state.min) / w,
            t = (this.getToValue() - this.state.min) / w;

        this.singleHandleAsPercent = this.checkDiapason(RangeSliderUtil.toFixed(f), this.configuration.fromMin, this.configuration.fromMax);
        this.fromHandleAsPercent = this.checkDiapason(RangeSliderUtil.toFixed(f), this.configuration.fromMin, this.configuration.fromMax);
        this.toHandleAsPercent = this.checkDiapason(RangeSliderUtil.toFixed(t), this.configuration.toMin, this.configuration.toMax);

        this.target = undefined;
    }

    private calcForBothOneTarget(realX: number) {
        const full = this.toHandleAsPercent - this.fromHandleAsPercent,
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

        this.fromHandleAsPercent = this.checkDiapason(this.state.getPercentAccordingToStep(newFrom), this.configuration.fromMin, this.configuration.fromMax);

        this.toHandleAsPercent = this.checkDiapason(this.state.getPercentAccordingToStep(newTo), this.configuration.toMin, this.configuration.toMax);
    }

    /**
     * calculates pointer X in percent
     */
    private calcPointerPercent(): void {
        const rangeSliderWidth = this.domElement.getElement(RangeSliderElement.rangeSlider).offsetWidth;

        if (!rangeSliderWidth) {
            return;
        }

        if (this.currentPosition < 0 || isNaN(this.currentPosition)) {
            this.currentPosition = 0;
        } else if (this.currentPosition > rangeSliderWidth) {
            this.currentPosition = rangeSliderWidth;
        }
    }

    private getPointerAsPercent(): number {
        return this.domElement.getPercent(this.currentPosition);
    }

    private convertToRealPercent(fake: number): number {
        const full = 100 - this.domElement.getHandleWidthAsPercent();
        return fake / full * 100;
    }

    private convertToFakePercent(real: number): number {
        const full = 100 - this.domElement.getHandleWidthAsPercent();
        return real / 100 * full;
    }

    private getHandleX(): number {
        const max = 100 - this.domElement.getHandleWidthAsPercent();
        let x = RangeSliderUtil.toFixed(this.getPointerAsPercent() - this.gapBetweenPointerAndHandle);

        if (x < 0) {
            x = 0;
        } else if (x > max) {
            x = max;
        }

        return x;
    }

    /**
     * Find closest handle to pointer click
     */
    private chooseHandle(realX: number): TargetType {
        if (this.configuration.type === SliderType.single) {
            return TargetType.single;
        } else {
            const mousePoint = this.fromHandleAsPercent + (this.toHandleAsPercent - this.fromHandleAsPercent) / 2;
            if (realX >= mousePoint) {
                return this.configuration.toFixed ? TargetType.from : TargetType.to;
            } else {
                return this.configuration.fromFixed ? TargetType.to : TargetType.from;
            }
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
        const rangeSliderWidth = this.domElement.getElement(RangeSliderElement.rangeSlider).offsetWidth;

        if (!rangeSliderWidth) {
            return;
        }

        if (rangeSliderWidth !== this.previousRangeSliderWidth) {
            this.target = TargetType.base;
            this.isResize = true;
        }

        if (rangeSliderWidth !== this.previousRangeSliderWidth || this.forceRedraw) {
            this.calc(true);
            this.drawLabels();
            if (this.configuration.grid) {
                this.domElement.updateGrid(this.state.getGridLabelsCount());
            }
            this.forceRedraw = true;
            this.previousRangeSliderWidth = rangeSliderWidth;
        }

        if (!rangeSliderWidth) {
            return;
        }

        if (!this.domElement.isDragging && !this.forceRedraw && !this.isKey) {
            return;
        }

        const from = this.getFromValue(), to = this.getToValue();
        if (this.previousResultFrom !== from || this.previousResultTo !== to || this.forceRedraw || this.isKey) {
            this.drawLabels();

            const barElement = this.domElement.getElement(RangeSliderElement.bar);
            const singleFake = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.spanSingle).offsetWidth),
                handleWidthAsPercent = this.domElement.getHandleWidthAsPercent();

            if (this.configuration.type === SliderType.single) {
                const singleFakeAsPercent = this.convertToFakePercent(this.singleHandleAsPercent);
                barElement.style.left = "0";
                barElement.style.width = `${(singleFakeAsPercent + (handleWidthAsPercent / 2)).toString(10)}%`;
                this.domElement.getElement(RangeSliderElement.singleHandle).style.left = singleFakeAsPercent.toString(10) + "%";

                const singleLeft = this.domElement.constrainValue(singleFakeAsPercent + (handleWidthAsPercent / 2) - (singleFake / 2), singleFake);

                this.domElement.getElement(RangeSliderElement.spanSingle).style.left = singleLeft.toString(10) + "%";
            } else {
                const fromAsFakePercent = this.convertToFakePercent(this.fromHandleAsPercent),
                    toAsFakePercent = this.convertToFakePercent(this.toHandleAsPercent);
                barElement.style.left = RangeSliderUtil.toFixed(fromAsFakePercent + (handleWidthAsPercent / 2)).toString(10) + "%";
                barElement.style.width = RangeSliderUtil.toFixed(toAsFakePercent - fromAsFakePercent).toString(10) + "%";

                this.domElement.getElement(RangeSliderElement.spanFrom).style.left = fromAsFakePercent.toString(10) + "%";
                this.domElement.getElement(RangeSliderElement.spanTo).style.left = toAsFakePercent.toString(10) + "%";

                const fromFake = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.from).offsetWidth);
                const fromLeft = this.domElement.constrainValue(RangeSliderUtil.toFixed(fromAsFakePercent + (handleWidthAsPercent / 2) - fromFake / 2), fromFake);
                if (this.previousResultFrom !== from || this.forceRedraw) {
                    this.domElement.getElement(RangeSliderElement.from).style.left = fromLeft.toString(10) + "%";
                }

                const toFake = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.to).offsetWidth);
                const toLeft = this.domElement.constrainValue(RangeSliderUtil.toFixed(toAsFakePercent + (handleWidthAsPercent / 2) - (toFake / 2)), toFake);
                if (this.previousResultTo !== to || this.forceRedraw) {
                    this.domElement.getElement(RangeSliderElement.to).style.left = toLeft.toString(10) + "%";
                }

                const singleLeft = this.domElement.constrainValue(RangeSliderUtil.toFixed((fromLeft + toLeft + toFake) / 2 - singleFake / 2), singleFake);
                this.domElement.getElement(RangeSliderElement.spanSingle).style.left = singleLeft.toString(10) + "%";
            }

            this.updateDatasetInputElement();

            if ((this.previousResultFrom !== from || this.previousResultTo !== to) && !this.isStart) {
                RangeSlider.trigger("input", this.domElement.input);
            }

            this.previousResultFrom = from;
            this.previousResultTo = to;

            if (!this.isResize && !this.isUpdate && !this.isStart) {
                this.callback(CallbackType.onChange);
            }
            if (this.isKey || this.isClick) {
                this.isKey = false;
                this.isClick = false;
                this.callback(CallbackType.onFinish);
            }

            this.isUpdate = false;
            this.isResize = false;
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

        const from = this.getFromValue(),
            to = this.getToValue(),
            minLabelAsPercents = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.min).offsetWidth),
            maxLabelAsPercents = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.max).offsetWidth),
            fromFake = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.from).offsetWidth),
            singleFake = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.spanSingle).offsetWidth),
            handleWidthAsPercent = this.domElement.getHandleWidthAsPercent()

        if (this.configuration.type === SliderType.single) {
            this.domElement.getElement(RangeSliderElement.spanSingle).innerHTML = this.state.decorate(from);

            const singleLeft = this.domElement.constrainValue(this.convertToFakePercent(this.singleHandleAsPercent) + (handleWidthAsPercent / 2) - (singleFake / 2), singleFake);

            if (singleLeft < minLabelAsPercents + 1) {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "visible";
            }

            if (singleLeft + singleFake > 100 - maxLabelAsPercents - 1) {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "visible";
            }

        } else {
            this.domElement.getElement(RangeSliderElement.spanSingle).innerHTML = this.state.decorateForCollapsedValues(from, to);
            this.domElement.getElement(RangeSliderElement.from).innerHTML = this.state.decorate(from);
            this.domElement.getElement(RangeSliderElement.to).innerHTML = this.state.decorate(to);

            const fromLeft = this.domElement.constrainValue(RangeSliderUtil.toFixed(this.convertToFakePercent(this.fromHandleAsPercent) + (handleWidthAsPercent / 2) - (fromFake / 2)), fromFake),
                toFake = this.domElement.getPercent(this.domElement.getElement(RangeSliderElement.to).offsetWidth),
                toLeft = this.domElement.constrainValue(RangeSliderUtil.toFixed(this.convertToFakePercent(this.toHandleAsPercent) + (handleWidthAsPercent / 2) - (toFake / 2)), toFake),
                singleLeft = this.domElement.constrainValue(RangeSliderUtil.toFixed((fromLeft + toLeft + toFake) / 2 - singleFake / 2), singleFake),
                min = Math.min(singleLeft, fromLeft);
            let max = Math.max(singleLeft + singleFake, toLeft + toFake);

            if (fromLeft + fromFake >= toLeft) {
                this.domElement.getElement(RangeSliderElement.from).style.visibility = "hidden";
                this.domElement.getElement(RangeSliderElement.to).style.visibility = "hidden";
                this.domElement.getElement(RangeSliderElement.spanSingle).style.visibility = "visible";

                if (from === to) {
                    if (this.target === TargetType.from) {
                        this.domElement.getElement(RangeSliderElement.from).style.visibility = "visible";
                    } else if (this.target === TargetType.to) {
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

            if (min < minLabelAsPercents + 1) {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.min).style.visibility = "visible";
            }

            if (max > 100 - maxLabelAsPercents - 1) {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "hidden";
            } else {
                this.domElement.getElement(RangeSliderElement.max).style.visibility = "visible";
            }
        }
    }

    /**
     * Write values to input element
     */
    private updateDatasetInputElement(): void {
        const from = this.getFromValue(),
            input = this.domElement.input;
        if (this.configuration.type === SliderType.single) {
            if (this.state.hasCustomValues()) {
                const value = this.state.getCustomValue(from);
                input.value = typeof value === "number" ? value.toString(10) : value;
            } else {
                input.value = from.toString(10);
            }
            input.dataset.from = from.toString(10);
        } else {
            const to = this.getToValue();
            if (this.state.hasCustomValues()) {
                input.value = `${this.state.getCustomValue(from)}${this.configuration.inputValuesSeparator}${this.state.getCustomValue(to)}`;
            } else {
                input.value = `${from}${this.configuration.inputValuesSeparator}${to}`;
            }
            input.dataset.from = from.toString(10);
            input.dataset.to = to.toString(10);
        }
    }

    private getFromValue(): number {
        if (this.configuration.type === SliderType.single) {
            return this.state.convertToValue(this.singleHandleAsPercent);
        } else {
            return this.state.convertToValue(this.fromHandleAsPercent);
        }
    }

    private getToValue(): number {
        if (this.configuration.type === SliderType.single) {
            return this.configuration.to;
        } else {
            return this.state.convertToValue(this.toHandleAsPercent);
        }
    }

    private callback(callbackType: CallbackType) {
        this.updateDatasetInputElement();
        if (!this.configuration[callbackType] || typeof this.configuration[callbackType] !== "function") {
            return;
        }
        const event = new RangeSliderEvent(this.configuration.type, this.state, this.domElement.input, this.domElement.container, {
            fromReal: this.fromHandleAsPercent,
            singleReal: this.singleHandleAsPercent,
            toReal: this.toHandleAsPercent
        });
        this.configuration[callbackType].call(this.configuration.callbackScope ? this.configuration.callbackScope : this, event);
    }

    // =============================================================================================================
    // Service methods
    // =============================================================================================================

    private toggleInput(): void {
        const input = this.domElement.input;
        input.classList.toggle("irs-hidden-input");

        if (this.hasTabIndex) {
            input.tabIndex = -1;
        } else {
            input.removeAttribute("tabindex");
        }

        this.hasTabIndex = !this.hasTabIndex;
    }

    private checkMinInterval(currentPercent: number, nextPercent: number, type: TargetType): number {
        return this.checkInterval(this.configuration.minInterval, currentPercent, nextPercent, type);
    }

    private checkMaxInterval(currentPercent: number, nextPercent: number, type: TargetType): number {
        return this.checkInterval(this.configuration.maxInterval, currentPercent, nextPercent, type);
    }

    private checkInterval(interval: number, currentPercent: number, nextPercent: number, type: TargetType): number {
        if (!interval) {
            return currentPercent;
        }

        let current: number = this.state.convertToValue(currentPercent);
        const next = this.state.convertToValue(nextPercent);

        if (type === TargetType.from) {

            if (next - current > interval) {
                current = next - interval;
            }
        } else {

            if (current - next > interval) {
                current = next + interval;
            }
        }

        return this.state.convertToPercent(current);
    }

    private checkDiapason(numberPercent: number, min: number, max: number) {
        let num = this.state.convertToValue(numberPercent);

        if (typeof min !== "number") {
            min = this.state.min;
        }

        if (typeof max !== "number") {
            max = this.state.max;
        }

        if (num < min) {
            num = min;
        }

        if (num > max) {
            num = max;
        }

        return this.state.convertToPercent(num);
    }

    // =============================================================================================================
    // Public methods
    // =============================================================================================================

    public update(options?: Partial<IRangeSliderOptions<number | string>>) {
        if (!this.domElement.input) {
            return;
        }

        this.isUpdate = true;

        this.configuration.from = this.getFromValue();
        if (this.configuration.type === SliderType.double) {
            this.configuration.to = this.getToValue();
        }
        const updateCheck = {from: this.configuration.from, to: this.configuration.to};

        this.configuration = RangeSliderUtil.mergeConfigurations(this.configuration, options, updateCheck);
        this.state = new RangeSliderState(this.configuration);

        this.toggleInput();
        this.remove();
        this.execute(CallbackType.onUpdate);
    }

    public reset(): void {
        if (!this.domElement.input) {
            return;
        }

        this.update();
    }

    public destroy(): void {
        if (!this.domElement.input) {
            return;
        }

        this.toggleInput();
        this.domElement.input.readOnly = false;

        this.remove();
        this.configuration = undefined;
        this.state = undefined;
        this.domElement = undefined;
        this.eventBus = undefined;
    }
}
