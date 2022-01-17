import {ICacheRangeSlider, Template} from "./cache-range-slider";
import {
    IRangeSliderConfiguration,
    RangeSliderConfigurationUtil, RangeSliderEvent
} from "./range-slider-configuration";

export interface ISlider {
    destroy(): void;

    reset(): void;

    update(option: Partial<IRangeSliderConfiguration>): void;
}

export class Slider implements ISlider {
    private static currentPluginCount = 0;

    private readonly cache: ICacheRangeSlider;
    private readonly plugin_count: number;
    private readonly result: RangeSliderEvent;

    private input?: HTMLInputElement;
    private current_plugin = 0;
    private calc_count = 0;
    private update_tm?: number;
    private old_from = 0;
    private old_to = 0;
    private old_min_interval?: number;
    private raf_id?: number;
    private dragging = false;
    private force_redraw = false;
    private no_diapason = false;
    private has_tab_index = true;
    private is_key = false;
    private is_update = false;
    private is_start = true;
    private is_finish = false;
    private is_active = false;
    private is_resize = false;
    private is_click = false;
    private configuration: IRangeSliderConfiguration;
    // private options: any;
    private labels: any;
    private coords: any;
    private update_check?: { from: number, to: number };
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
        const version = matches[0].split(' ')[1];
        if (parseFloat(version) >= 9) {
            return false;
        }
        const html = document.querySelector('html');
        const classToAdd = 'lt-ie9';
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
        this.plugin_count = Slider.getCurrentPluginCount();

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
            s_single: null,
            s_from: null,
            s_to: null,
            shad_single: null,
            shad_from: null,
            shad_to: null,
            edge: null,
            grid: null,
            grid_labels: []
        };

        // storage for measure variables
        this.coords = {
            // left
            x_gap: 0,
            x_pointer: 0,

            // width
            w_rs: 0,
            w_rs_old: 0,
            w_handle: 0,

            // percents
            p_gap: 0,
            p_gap_left: 0,
            p_gap_right: 0,
            p_step: 0,
            p_pointer: 0,
            p_handle: 0,
            p_single_fake: 0,
            p_single_real: 0,
            p_from_fake: 0,
            p_from_real: 0,
            p_to_fake: 0,
            p_to_real: 0,
            p_bar_x: 0,
            p_bar_w: 0,

            // grid
            grid_gap: 0,
            big_num: 0,
            big: [],
            big_w: [],
            big_p: [],
            big_x: []
        };

        // storage for labels measure variables
        this.labels = {
            // width
            w_min: 0,
            w_max: 0,
            w_from: 0,
            w_to: 0,
            w_single: 0,

            // percents
            p_min: 0,
            p_max: 0,
            p_from_fake: 0,
            p_from_left: 0,
            p_to_fake: 0,
            p_to_left: 0,
            p_single_fake: 0,
            p_single_left: 0
        };

        /**
         * get and validate config
         */
        const inputElement = this.cache.input;
        if (!inputElement) {
            throw Error("Given input element does not exist")
        }

        // check if base element is input
        if (inputElement.nodeName !== 'INPUT') {
            throw Error('Base element should be <input>!');
        }

        // merge configurations
        this.configuration = RangeSliderConfigurationUtil.initializeConfiguration(options, inputElement.value);

        // validate config, to be sure that all data types are correct
        this.update_check = undefined;

        // default result object, returned to callbacks
        this.result = {
            input: this.cache.input,
            slider: undefined,

            min: this.configuration.min,
            max: this.configuration.max,

            from: this.configuration.from,
            from_percent: 0,
            from_value: undefined,

            to: this.configuration.to,
            to_percent: 0,
            to_value: undefined,

            min_pretty: undefined,
            max_pretty: undefined,
            
            from_pretty: undefined,
            to_pretty: undefined
        };
        
        this.init();
    }

    /**
     * Starts or updates the plugin instance
     */
    private init(is_update?: boolean): void {
        this.no_diapason = false;
        this.coords.p_step = this.convertToPercent(this.configuration.step, true);
        this.target = 'base';

        this.toggleInput();
        this.append();
        this.setMinMax();

        if (is_update) {
            this.force_redraw = true;
            this.calc(true);

            // callbacks called
            this.callOnUpdate();
        } else {
            this.force_redraw = true;
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
        const container_html = '<span class="irs irs--' + this.configuration.skin + ' js-irs-' + this.plugin_count + ' ' + this.configuration.extra_classes + '"></span>';

        if (!this.cache.input) {
            throw Error("Given input element does not exist");
        }

        this.cache.input.insertAdjacentHTML('beforebegin', container_html);
        this.cache.input.readOnly = true;
        this.cache.cont = this.cache.input.previousElementSibling;

        if (!this.cache.cont) {
            throw Error("Cache container could not be added before the input")
        }

        this.result.slider = this.cache.cont;

        this.cache.cont.innerHTML = Template.base_html;
        this.cache.rs = this.cache.cont.querySelector('.irs');
        this.cache.min = this.cache.cont.querySelector('.irs-min');
        this.cache.max = this.cache.cont.querySelector('.irs-max');
        this.cache.from = this.cache.cont.querySelector('.irs-from');
        this.cache.to = this.cache.cont.querySelector('.irs-to');
        this.cache.single = this.cache.cont.querySelector('.irs-single');
        this.cache.line = this.cache.cont.querySelector('.irs-line');
        this.cache.grid = this.cache.cont.querySelector('.irs-grid');

        if (this.configuration.type === 'single') {
            this.cache.cont.insertAdjacentHTML('beforeend', Template.single_html);
            this.cache.bar = this.cache.cont.querySelector('.irs-bar');
            this.cache.edge = this.cache.cont.querySelector('.irs-bar-edge');
            this.cache.s_single = this.cache.cont.querySelector('.single');
            this.cache.from!.style.visibility = 'hidden';
            this.cache.to!.style.visibility = 'hidden';
            this.cache.shad_single = this.cache.cont.querySelector('.shadow-single');
        } else {
            this.cache.cont.insertAdjacentHTML('beforeend', Template.double_html);
            this.cache.bar = this.cache.cont.querySelector('.irs-bar');
            this.cache.s_from = this.cache.cont.querySelector('.from');
            this.cache.s_to = this.cache.cont.querySelector('.to');
            this.cache.shad_from = this.cache.cont.querySelector('.shadow-from');
            this.cache.shad_to = this.cache.cont.querySelector('.shadow-to');

            this.setTopHandler();
        }

        if (this.configuration.hide_from_to) {
            this.cache.from!.style.display = 'none';
            this.cache.to!.style.display = 'none';
            this.cache.single!.style.display = 'none';
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

        if (this.configuration.drag_interval) {
            this.cache.bar!.style.cursor = 'ew-resize';
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
            this.cache.s_from!.classList.add('type_last');
        } else if (to < max) {
            this.cache.s_to!.classList.add('type_last');
        }
    }

    /**
     * Determine which handles was clicked last
     * and which handler should have hover effect
     */
    private changeLevel(target: string): void {
        switch (target) {
            case 'single':
                this.coords.p_gap = Slider.toFixed(this.coords.p_pointer - this.coords.p_single_fake);
                this.cache.s_single!.classList.add('state_hover');
                break;
            case 'from':
                this.coords.p_gap = Slider.toFixed(this.coords.p_pointer - this.coords.p_from_fake);
                this.cache.s_from!.classList.add('state_hover');
                this.cache.s_from!.classList.add('type_last');
                this.cache.s_to!.classList.remove('type_last');
                break;
            case 'to':
                this.coords.p_gap = Slider.toFixed(this.coords.p_pointer - this.coords.p_to_fake);
                this.cache.s_to!.classList.add('state_hover');
                this.cache.s_to!.classList.add('type_last');
                this.cache.s_from!.classList.remove('type_last');
                break;
            case 'both':
                this.coords.p_gap_left = Slider.toFixed(this.coords.p_pointer - this.coords.p_from_fake);
                this.coords.p_gap_right = Slider.toFixed(this.coords.p_to_fake - this.coords.p_pointer);
                this.cache.s_to!.classList.remove('type_last');
                this.cache.s_from!.classList.remove('type_last');
                break;
        }
    }

    /**
     * Then slider is disabled
     * appends extra layer with opacity
     */
    private appendDisableMask(): void {
        this.cache.cont!.innerHTML = Template.disable_html;
        this.cache.cont!.classList.add('irs-disabled');
    }

    /**
     * Then slider is not disabled
     * remove disable mask
     */
    private removeDisableMask(): void {
        Slider.removeElement(this.cache.cont!.querySelector('.irs-disable-mask'));
        this.cache.cont!.classList.remove('irs-disabled');
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

        this.cache.grid_labels = [];
        this.coords.big = [];
        this.coords.big_w = [];
        this.coords.big_p = [];
        this.coords.big_x = [];

        if (this.raf_id) {
            cancelAnimationFrame(this.raf_id);
            this.raf_id = undefined;
        }
    }

    /**
     * bind all slider events
     */
    private bindEvents(): void {
        if (this.no_diapason) {
            return;
        }

        this.cache.body.addEventListener('touchmove', (e: TouchEvent) => this.pointerMove(e));
        this.cache.body.addEventListener('mousemove', (e: MouseEvent) => this.pointerMove(e));
        this.cache.win.addEventListener('touchend', (e: TouchEvent) => this.pointerUp(e));
        this.cache.win.addEventListener('mouseup', (e: MouseEvent) => this.pointerUp(e));
        this.cache.line!.addEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));
        this.cache.line!.addEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
        this.cache.line!.addEventListener('focus', (e: FocusEvent) => this.pointerFocus(e));

        if (this.configuration.drag_interval && this.configuration.type === 'double') {
            this.cache.bar!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown('both', e));
            this.cache.bar!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown('both', e));
        } else {
            this.cache.bar!.addEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));
            this.cache.bar!.addEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
        }

        if (this.configuration.type === 'single') {
            this.cache.single!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown('single', e));
            this.cache.s_single!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown('single', e));
            this.cache.shad_single!.addEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));

            this.cache.single!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown('single', e));
            this.cache.s_single!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown('single', e));
            this.cache.shad_single!.addEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));

            if (this.cache.edge) {
                this.cache.edge.addEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
            }
        } else {
            this.cache.single!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown(null, e));
            this.cache.single!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown(null, e));

            this.cache.from!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown('from', e));
            this.cache.s_from!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown('from', e));
            this.cache.to!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown('to', e));
            this.cache.s_to!.addEventListener('touchstart', (e: TouchEvent) => this.pointerDown('to', e));
            this.cache.shad_from!.addEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));
            this.cache.shad_to!.addEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));

            this.cache.from!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown('from', e));
            this.cache.s_from!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown('from', e));
            this.cache.to!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown('to', e));
            this.cache.s_to!.addEventListener('mousedown', (e: MouseEvent) => this.pointerDown('to', e));
            this.cache.shad_from!.addEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
            this.cache.shad_to!.addEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
        }

        if (this.configuration.keyboard) {
            this.cache.line!.addEventListener('keydown', (e: KeyboardEvent) => this.key('keyboard', e));
        }

        if (Slider.getIsOldIe()) {
            this.cache.body.addEventListener('mouseup', (e: MouseEvent) => this.pointerUp(e));
            this.cache.body.addEventListener('mouseleave', e => this.pointerUp(e));
        }
    }

    /**
     * Focus with tabIndex
     */
    private pointerFocus(_: any): void {
        if (!this.target) {
            let x;
            let handle;

            if (this.configuration.type === 'single') {
                handle = this.cache.single;
            } else {
                handle = this.cache.from;
            }

            if (!handle) {
                throw Error("Handle is not defined");
            }
            x = Slider.getOffset(handle).left;
            x += (handle.offsetWidth / 2) - 1;

            this.pointerClick('single', {
                preventDefault: () => { return; }, pageX: x
            });
        }
    }

    private static getOffset(element: any): { top: number, left: number } {
        const rect = element.getBoundingClientRect();

        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
        };
    }

    /**
     * Mousemove or touchmove
     * only for handlers
     */
    private pointerMove(e: any): any {
        if (!this.dragging) {
            return;
        }

        const x = e.pageX || e.originalEvent.touches && e.originalEvent.touches[0].pageX;
        this.coords.x_pointer = x - this.coords.x_gap;

        this.calc();
    }

    /**
     * Mouseup or touchend
     * only for handlers
     */
    private pointerUp(e: any): void {
        if (this.current_plugin !== this.plugin_count) {
            return;
        }

        if (this.is_active) {
            this.is_active = false;
        } else {
            return;
        }

        Slider.removeClass(this.cache.cont!.querySelector('.state_hover'), 'state_hover');

        this.force_redraw = true;

        this.updateScene();
        this.restoreOriginalMinInterval();

        // callbacks call
        if (this.cache.cont!.contains(e.target) || this.dragging) {
            this.callOnFinish();
        }

        this.dragging = false;
    }

    private static removeClass(element: HTMLElement | any, klass: string): void {
        if (element && element.classList) {
            element.classList.remove(klass);
        }
    }

    /**
     * Mousedown or touchstart
     * only for handlers
     */
    private pointerDown(target: string | null, e: any): void {
        e.preventDefault();
        const x = e.pageX || e.originalEvent.touches && e.originalEvent.touches[0].pageX;
        if (e.button === 2) {
            return;
        }

        if (target === 'both') {
            this.setTempMinInterval();
        }

        if (!target) {
            target = this.target || 'from';
        }

        this.current_plugin = this.plugin_count;
        this.target = target;

        this.is_active = true;
        this.dragging = true;

        this.coords.x_gap = Slider.getOffset(this.cache.rs).left;
        this.coords.x_pointer = x - this.coords.x_gap;

        this.calcPointerPercent();
        this.changeLevel(target);

        Slider.trigger('focus', this.cache.line);

        this.updateScene();
    }

    /**
     * Mousedown or touchstart
     * for other slider elements, like diapason line
     */
    private pointerClick(target: string, e: any): void {
        e.preventDefault();
        const x = e.pageX || e.originalEvent.touches && e.originalEvent.touches[0].pageX;
        if (e.button === 2) {
            return;
        }

        this.current_plugin = this.plugin_count;
        this.target = target;

        this.is_click = true;
        this.coords.x_gap = Slider.getOffset(this.cache.rs).left;
        this.coords.x_pointer = +(x - this.coords.x_gap).toFixed();

        this.force_redraw = true;
        this.calc();

        Slider.trigger('focus', this.cache.line);
    }

    private static trigger(type: string, element: any) {
        const evt = new Event(type, {bubbles: true, cancelable: true})
        element.dispatchEvent(evt);
    }

    /**
     * Keyboard controls for focused slider
     */
    private key(_: string, e: any) {
        if (this.current_plugin !== this.plugin_count || e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) {
            return;
        }

        switch (e.which) {
            case 83: // W
            case 65: // A
            case 40: // DOWN
            case 37: // LEFT
                e.preventDefault();
                this.moveByKey(false);
                break;

            case 87: // S
            case 68: // D
            case 38: // UP
            case 39: // RIGHT
                e.preventDefault();
                this.moveByKey(true);
                break;
        }
    }

    /**
     * Move by key
     */
    private moveByKey(right: boolean): void {
        let p = this.coords.p_pointer;
        let p_step = (this.configuration.max - this.configuration.min) / 100;
        p_step = this.configuration.step / p_step;

        if (right) {
            p += p_step;
        } else {
            p -= p_step;
        }

        this.coords.x_pointer = Slider.toFixed(this.coords.w_rs / 100 * p);
        this.is_key = true;
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

        if (this.configuration.hide_min_max) {
            this.cache.min!.style.display = 'none';
            this.cache.max!.style.display = 'none';
            return;
        }

        if (this.configuration.values.length) {
            this.cache.min!.innerHTML = this.decorate(this.configuration.p_values[this.configuration.min]);
            this.cache.max!.innerHTML = this.decorate(this.configuration.p_values[this.configuration.max]);
        } else {
            const min_pretty = this._prettify(this.configuration.min);
            const max_pretty = this._prettify(this.configuration.max);

            this.result.min_pretty = min_pretty;
            this.result.max_pretty = max_pretty;

            this.cache.min!.innerHTML = this.decorate(min_pretty, this.configuration.min);
            this.cache.max!.innerHTML = this.decorate(max_pretty, this.configuration.max);
        }

        this.labels.w_min = Slider.outerWidth(this.cache.min);
        this.labels.w_max = Slider.outerWidth(this.cache.max);
    }

    private static outerWidth(el, includeMargin = false): number {
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

        if (this.old_min_interval === null) {
            this.old_min_interval = this.configuration.min_interval;
        }

        this.configuration.min_interval = interval;
    }

    /**
     * Restore min_interval option to original
     */
    private restoreOriginalMinInterval(): void {
        if (this.old_min_interval) {
            this.configuration.min_interval = this.old_min_interval;
            this.old_min_interval = undefined;
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

        this.calc_count++;

        if (this.calc_count === 10 || update) {
            this.calc_count = 0;
            this.coords.w_rs = Slider.outerWidth(this.cache.rs, false);

            this.calcHandlePercent();
        }

        if (!this.coords.w_rs) {
            return;
        }

        this.calcPointerPercent();
        let handle_x = this.getHandleX();

        if (this.target === 'both') {
            this.coords.p_gap = 0;
            handle_x = this.getHandleX();
        }

        if (this.target === 'click') {
            this.coords.p_gap = this.coords.p_handle / 2;
            handle_x = this.getHandleX();

            if (this.configuration.drag_interval) {
                this.target = 'both_one';
            } else {
                this.target = this.chooseHandle(handle_x);
            }
        }

        switch (this.target) {
            case 'base':
                this.calcForBaseTarget();
                break;
            case 'single':
                if (this.configuration.from_fixed) {
                    break;
                }

                this.coords.p_single_real = this.convertToRealPercent(handle_x);
                this.coords.p_single_real = this.calcWithStep(this.coords.p_single_real);
                this.coords.p_single_real = this.checkDiapason(this.coords.p_single_real, this.configuration.from_min, this.configuration.from_max);

                this.coords.p_single_fake = this.convertToFakePercent(this.coords.p_single_real);

                break;

            case 'from':
                if (this.configuration.from_fixed) {
                    break;
                }

                this.coords.p_from_real = this.convertToRealPercent(handle_x);
                this.coords.p_from_real = this.calcWithStep(this.coords.p_from_real);
                if (this.coords.p_from_real > this.coords.p_to_real) {
                    this.coords.p_from_real = this.coords.p_to_real;
                }
                this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.configuration.from_min, this.configuration.from_max);
                this.coords.p_from_real = this.checkMinInterval(this.coords.p_from_real, this.coords.p_to_real, 'from');
                this.coords.p_from_real = this.checkMaxInterval(this.coords.p_from_real, this.coords.p_to_real, 'from');

                this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real);

                break;

            case 'to':
                if (this.configuration.to_fixed) {
                    break;
                }

                this.coords.p_to_real = this.convertToRealPercent(handle_x);
                this.coords.p_to_real = this.calcWithStep(this.coords.p_to_real);
                if (this.coords.p_to_real < this.coords.p_from_real) {
                    this.coords.p_to_real = this.coords.p_from_real;
                }
                this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.configuration.to_min, this.configuration.to_max);
                this.coords.p_to_real = this.checkMinInterval(this.coords.p_to_real, this.coords.p_from_real, 'to');
                this.coords.p_to_real = this.checkMaxInterval(this.coords.p_to_real, this.coords.p_from_real, 'to');

                this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real);

                break;

            case 'both':
                if (this.configuration.from_fixed || this.configuration.to_fixed) {
                    break;
                }

                handle_x = Slider.toFixed(handle_x + (this.coords.p_handle * 0.001));

                this.coords.p_from_real = this.convertToRealPercent(handle_x) - this.coords.p_gap_left;
                this.coords.p_from_real = this.calcWithStep(this.coords.p_from_real);
                this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.configuration.from_min, this.configuration.from_max);
                this.coords.p_from_real = this.checkMinInterval(this.coords.p_from_real, this.coords.p_to_real, 'from');
                this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real);

                this.coords.p_to_real = this.convertToRealPercent(handle_x) + this.coords.p_gap_right;
                this.coords.p_to_real = this.calcWithStep(this.coords.p_to_real);
                this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.configuration.to_min, this.configuration.to_max);
                this.coords.p_to_real = this.checkMinInterval(this.coords.p_to_real, this.coords.p_from_real, 'to');
                this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real);

                break;

            case 'both_one':
                this.calcForBothOneTarget(this.convertToRealPercent(handle_x));
                break;
        }

        if (this.configuration.type === 'single') {
            this.coords.p_bar_x = (this.coords.p_handle / 2);
            this.coords.p_bar_w = this.coords.p_single_fake;

            this.result.from_percent = this.coords.p_single_real;
            this.result.from = this.convertToValue(this.coords.p_single_real);
            this.result.from_pretty = this._prettify(this.result.from);

            if (this.configuration.values.length) {
                this.result.from_value = this.configuration.values[this.result.from];
            }
        } else {
            this.coords.p_bar_x = Slider.toFixed(this.coords.p_from_fake + (this.coords.p_handle / 2));
            this.coords.p_bar_w = Slider.toFixed(this.coords.p_to_fake - this.coords.p_from_fake);

            this.result.from_percent = this.coords.p_from_real;
            this.result.from = this.convertToValue(this.coords.p_from_real);
            this.result.from_pretty = this._prettify(this.result.from);
            this.result.to_percent = this.coords.p_to_real;
            this.result.to = this.convertToValue(this.coords.p_to_real);
            this.result.to_pretty = this._prettify(this.result.to);

            if (this.configuration.values.length) {
                this.result.from_value = this.configuration.values[this.result.from];
                this.result.to_value = this.configuration.values[this.result.to];
            }
        }

        this.calcMinMax();
        this.calcLabels();
    }

    private calcForBaseTarget() {
        const w = (this.configuration.max - this.configuration.min) / 100,
            f = (this.result.from - this.configuration.min) / w,
            t = (this.result.to - this.configuration.min) / w;

        this.coords.p_single_real = Slider.toFixed(f);
        this.coords.p_from_real = Slider.toFixed(f);
        this.coords.p_to_real = Slider.toFixed(t);

        this.coords.p_single_real = this.checkDiapason(this.coords.p_single_real, this.configuration.from_min, this.configuration.from_max);
        this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.configuration.from_min, this.configuration.from_max);
        this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.configuration.to_min, this.configuration.to_max);

        this.coords.p_single_fake = this.convertToFakePercent(this.coords.p_single_real);
        this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real);
        this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real);

        this.target = undefined;
    }
    
    private calcForBothOneTarget(real_x: number) {
        if (this.configuration.from_fixed || this.configuration.to_fixed) {
            return;
        }

        const from = this.result.from_percent,
            to = this.result.to_percent,
            full = to - from,
            half = full / 2;

        let new_from = real_x - half,
            new_to = real_x + half;

        if (new_from < 0) {
            new_from = 0;
            new_to = new_from + full;
        }

        if (new_to > 100) {
            new_to = 100;
            new_from = new_to - full;
        }

        this.coords.p_from_real = this.calcWithStep(new_from);
        this.coords.p_from_real = this.checkDiapason(this.coords.p_from_real, this.configuration.from_min, this.configuration.from_max);
        this.coords.p_from_fake = this.convertToFakePercent(this.coords.p_from_real);

        this.coords.p_to_real = this.calcWithStep(new_to);
        this.coords.p_to_real = this.checkDiapason(this.coords.p_to_real, this.configuration.to_min, this.configuration.to_max);
        this.coords.p_to_fake = this.convertToFakePercent(this.coords.p_to_real);
    }

    /**
     * calculates pointer X in percent
     */
    private calcPointerPercent(): void {
        if (!this.coords.w_rs) {
            this.coords.p_pointer = 0;
            return;
        }

        if (this.coords.x_pointer < 0 || isNaN(this.coords.x_pointer)) {
            this.coords.x_pointer = 0;
        } else if (this.coords.x_pointer > this.coords.w_rs) {
            this.coords.x_pointer = this.coords.w_rs;
        }

        this.coords.p_pointer = Slider.toFixed(this.coords.x_pointer / this.coords.w_rs * 100);
    }

    private convertToRealPercent(fake: number): number {
        const full = 100 - this.coords.p_handle;
        return fake / full * 100;
    }

    private convertToFakePercent(real: number): number {
        const full = 100 - this.coords.p_handle;
        return real / 100 * full;
    }

    private getHandleX(): number {
        const max = 100 - this.coords.p_handle;
        let x = Slider.toFixed(this.coords.p_pointer - this.coords.p_gap);

        if (x < 0) {
            x = 0;
        } else if (x > max) {
            x = max;
        }

        return x;
    }

    private calcHandlePercent(): void {
        if (this.configuration.type === 'single') {
            this.coords.w_handle = Slider.outerWidth(this.cache.s_single, false);
        } else {
            this.coords.w_handle = Slider.outerWidth(this.cache.s_from, false);
        }

        this.coords.p_handle = Slider.toFixed(this.coords.w_handle / this.coords.w_rs * 100);
    }

    /**
     * Find closest handle to pointer click
     */
    private chooseHandle(real_x: number): string {
        if (this.configuration.type === 'single') {
            return 'single';
        } else {
            const m_point = this.coords.p_from_real + ((this.coords.p_to_real - this.coords.p_from_real) / 2);
            if (real_x >= m_point) {
                return this.configuration.to_fixed ? 'from' : 'to';
            } else {
                return this.configuration.from_fixed ? 'to' : 'from';
            }
        }
    }

    /**
     * Measure Min and Max labels width in percent
     */
    private calcMinMax(): void {
        if (!this.coords.w_rs) {
            return;
        }

        this.labels.p_min = this.labels.w_min / this.coords.w_rs * 100;
        this.labels.p_max = this.labels.w_max / this.coords.w_rs * 100;
    }

    /**
     * Measure labels width and X in percent
     */
    private calcLabels(): void {
        if (!this.coords.w_rs || this.configuration.hide_from_to) {
            return;
        }

        if (this.configuration.type === 'single') {

            this.labels.w_single = Slider.outerWidth(this.cache.single, false);
            this.labels.p_single_fake = this.labels.w_single / this.coords.w_rs * 100;
            this.labels.p_single_left = this.coords.p_single_fake + (this.coords.p_handle / 2) - (this.labels.p_single_fake / 2);
            this.labels.p_single_left = this.checkEdges(this.labels.p_single_left, this.labels.p_single_fake);

        } else {

            this.labels.w_from = Slider.outerWidth(this.cache.from, false);
            this.labels.p_from_fake = this.labels.w_from / this.coords.w_rs * 100;
            this.labels.p_from_left = this.coords.p_from_fake + (this.coords.p_handle / 2) - (this.labels.p_from_fake / 2);
            this.labels.p_from_left = Slider.toFixed(this.labels.p_from_left);
            this.labels.p_from_left = this.checkEdges(this.labels.p_from_left, this.labels.p_from_fake);

            this.labels.w_to = Slider.outerWidth(this.cache.to, false);
            this.labels.p_to_fake = this.labels.w_to / this.coords.w_rs * 100;
            this.labels.p_to_left = this.coords.p_to_fake + (this.coords.p_handle / 2) - (this.labels.p_to_fake / 2);
            this.labels.p_to_left = Slider.toFixed(this.labels.p_to_left);
            this.labels.p_to_left = this.checkEdges(this.labels.p_to_left, this.labels.p_to_fake);

            this.labels.w_single = Slider.outerWidth(this.cache.single, false);
            this.labels.p_single_fake = this.labels.w_single / this.coords.w_rs * 100;
            this.labels.p_single_left = ((this.labels.p_from_left + this.labels.p_to_left + this.labels.p_to_fake) / 2) - (this.labels.p_single_fake / 2);
            this.labels.p_single_left = Slider.toFixed(this.labels.p_single_left);
            this.labels.p_single_left = this.checkEdges(this.labels.p_single_left, this.labels.p_single_fake);
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
        if (this.raf_id) {
            cancelAnimationFrame(this.raf_id);
            this.raf_id = undefined;
        }

        clearTimeout(this.update_tm);
        this.update_tm = undefined;

        if (!this.configuration) {
            return;
        }

        this.drawHandles();

        if (this.is_active) {
            this.raf_id = requestAnimationFrame(this.updateScene.bind(this));
        } else {
            this.update_tm = window.setTimeout(this.updateScene.bind(this), 300);
        }
    }

    /**
     * Draw handles
     */
    private drawHandles(): void {
        this.coords.w_rs = Slider.outerWidth(this.cache.rs, false);

        if (!this.coords.w_rs) {
            return;
        }

        if (this.coords.w_rs !== this.coords.w_rs_old) {
            this.target = 'base';
            this.is_resize = true;
        }

        if (this.coords.w_rs !== this.coords.w_rs_old || this.force_redraw) {
            this.setMinMax();
            this.calc(true);
            this.drawLabels();
            if (this.configuration.grid) {
                this.calcGridMargin();
                this.calcGridLabels();
            }
            this.force_redraw = true;
            this.coords.w_rs_old = this.coords.w_rs;
            this.drawShadow();
        }

        if (!this.coords.w_rs) {
            return;
        }

        if (!this.dragging && !this.force_redraw && !this.is_key) {
            return;
        }

        if (this.old_from !== this.result.from || this.old_to !== this.result.to || this.force_redraw || this.is_key) {

            this.drawLabels();

            this.cache.bar!.style.left = this.coords.p_bar_x + '%';
            this.cache.bar!.style.width = this.coords.p_bar_w + '%';

            if (this.configuration.type === 'single') {
                this.cache.bar!.style.left = "0";
                this.cache.bar!.style.width = this.coords.p_bar_w + this.coords.p_bar_x + '%';

                this.cache.s_single!.style.left = this.coords.p_single_fake + '%';

                this.cache.single!.style.left = this.labels.p_single_left + '%';
            } else {
                this.cache.s_from!.style.left = this.coords.p_from_fake + '%';
                this.cache.s_to!.style.left = this.coords.p_to_fake + '%';

                if (this.old_from !== this.result.from || this.force_redraw) {
                    this.cache.from!.style.left = this.labels.p_from_left + '%';
                }
                if (this.old_to !== this.result.to || this.force_redraw) {
                    this.cache.to!.style.left = this.labels.p_to_left + '%';
                }

                this.cache.single!.style.left = this.labels.p_single_left + '%';
            }

            this.writeToInput();

            if ((this.old_from !== this.result.from || this.old_to !== this.result.to) && !this.is_start) {
                // Override this event in component
                // this.trigger('change', this.cache.input);
                Slider.trigger('input', this.cache.input);
            }

            this.old_from = this.result.from;
            this.old_to = this.result.to;

            // callbacks call
            if (!this.is_resize && !this.is_update && !this.is_start && !this.is_finish) {
                this.callOnChange();
            }
            if (this.is_key || this.is_click) {
                this.is_key = false;
                this.is_click = false;
                this.callOnFinish();
            }

            this.is_update = false;
            this.is_resize = false;
            this.is_finish = false;
        }

        this.is_start = false;
        this.is_key = false;
        this.is_click = false;
        this.force_redraw = false;
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

        const values_num = this.configuration.values.length;
        const p_values = this.configuration.p_values;
        let text_single;
        let text_from;
        let text_to;
        let from_pretty;
        let to_pretty;

        if (this.configuration.hide_from_to) {
            return;
        }

        if (this.configuration.type === 'single') {

            if (values_num) {
                text_single = this.decorate(p_values[this.result.from]);
                this.cache.single!.innerHTML = text_single;
            } else {
                from_pretty = this._prettify(this.result.from);

                text_single = this.decorate(from_pretty, this.result.from);
                this.cache.single!.innerHTML = text_single;
            }

            this.calcLabels();

            if (this.labels.p_single_left < this.labels.p_min + 1) {
                this.cache.min!.style.visibility = 'hidden';
            } else {
                this.cache.min!.style.visibility = 'visible';
            }

            if (this.labels.p_single_left + this.labels.p_single_fake > 100 - this.labels.p_max - 1) {
                this.cache.max!.style.visibility = 'hidden';
            } else {
                this.cache.max!.style.visibility = 'visible';
            }

        } else {
            if (values_num) {

                if (this.configuration.decorate_both) {
                    text_single = this.decorate(p_values[this.result.from]);
                    text_single += this.configuration.values_separator;
                    text_single += this.decorate(p_values[this.result.to]);
                } else {
                    text_single = this.decorate(p_values[this.result.from] + this.configuration.values_separator + p_values[this.result.to]);
                }
                text_from = this.decorate(p_values[this.result.from]);
                text_to = this.decorate(p_values[this.result.to]);


                this.cache.single!.innerHTML = text_single;
                this.cache.from!.innerHTML = text_from;
                this.cache.to!.innerHTML = text_to;

            } else {
                from_pretty = this._prettify(this.result.from);
                to_pretty = this._prettify(this.result.to);
                
                if (this.configuration.decorate_both) {
                    text_single = this.decorate(from_pretty, this.result.from);
                    text_single += this.configuration.values_separator;
                    text_single += this.decorate(to_pretty, this.result.to);
                } else {
                    text_single = this.decorate(from_pretty + this.configuration.values_separator + to_pretty, this.result.to);
                }
                text_from = this.decorate(from_pretty, this.result.from);
                text_to = this.decorate(to_pretty, this.result.to);

                this.cache.single!.innerHTML = text_single;
                this.cache.from!.innerHTML = text_from;
                this.cache.to!.innerHTML = text_to;
            }

            this.calcLabels();

            const min = Math.min(this.labels.p_single_left, this.labels.p_from_left),
                single_left = this.labels.p_single_left + this.labels.p_single_fake,
                to_left = this.labels.p_to_left + this.labels.p_to_fake;
            let max = Math.max(single_left, to_left);

            if (this.labels.p_from_left + this.labels.p_from_fake >= this.labels.p_to_left) {
                this.cache.from!.style.visibility = 'hidden';
                this.cache.to!.style.visibility = 'hidden';
                this.cache.single!.style.visibility = 'visible';

                if (this.result.from === this.result.to) {
                    if (this.target === 'from') {
                        this.cache.from!.style.visibility = 'visible';
                    } else if (this.target === 'to') {
                        this.cache.to!.style.visibility = 'visible';
                    } else if (!this.target) {
                        this.cache.from!.style.visibility = 'visible';
                    }
                    this.cache.single!.style.visibility = 'hidden';
                    max = to_left;
                } else {
                    this.cache.from!.style.visibility = 'hidden';
                    this.cache.to!.style.visibility = 'hidden';
                    this.cache.single!.style.visibility = 'visible';
                    max = Math.max(single_left, to_left);
                }
            } else {
                this.cache.from!.style.visibility = 'visible';
                this.cache.to!.style.visibility = 'visible';
                this.cache.single!.style.visibility = 'hidden';
            }

            if (min < this.labels.p_min + 1) {
                this.cache.min!.style.visibility = 'hidden';
            } else {
                this.cache.min!.style.visibility = 'visible';
            }

            if (max > 100 - this.labels.p_max - 1) {
                this.cache.max!.style.visibility = 'hidden';
            } else {
                this.cache.max!.style.visibility = 'visible';
            }

        }
    }

    /**
     * Draw shadow intervals
     */
    private drawShadow(): void {
        const o = this.configuration,
            c = this.cache,

            is_from_min = typeof o.from_min === 'number' && !isNaN(o.from_min),
            is_from_max = typeof o.from_max === 'number' && !isNaN(o.from_max),
            is_to_min = typeof o.to_min === 'number' && !isNaN(o.to_min),
            is_to_max = typeof o.to_max === 'number' && !isNaN(o.to_max);

        let from_min, from_max, to_min, to_max;

        if (o.type === 'single') {
            if (o.from_shadow && (is_from_min || is_from_max)) {
                from_min = this.convertToPercent(is_from_min ? o.from_min : o.min);
                from_max = this.convertToPercent(is_from_max ? o.from_max : o.max) - from_min;
                from_min = Slider.toFixed(from_min - (this.coords.p_handle / 100 * from_min));
                from_max = Slider.toFixed(from_max - (this.coords.p_handle / 100 * from_max));
                from_min = from_min + (this.coords.p_handle / 2);

                c.shad_single!.style.display = 'block';
                c.shad_single!.style.left = from_min + '%';
                c.shad_single!.style.width = from_max + '%';
            } else {
                c.shad_single!.style.display = 'none';
            }
        } else {
            if (o.from_shadow && (is_from_min || is_from_max)) {
                from_min = this.convertToPercent(is_from_min ? o.from_min : o.min);
                from_max = this.convertToPercent(is_from_max ? o.from_max : o.max) - from_min;
                from_min = Slider.toFixed(from_min - (this.coords.p_handle / 100 * from_min));
                from_max = Slider.toFixed(from_max - (this.coords.p_handle / 100 * from_max));
                from_min = from_min + (this.coords.p_handle / 2);

                c.shad_from!.style.display = 'block';
                c.shad_from!.style.left = from_min + '%';
                c.shad_from!.style.width = from_max + '%';
            } else {
                c.shad_from!.style.display = 'none';
            }

            if (o.to_shadow && (is_to_min || is_to_max)) {
                to_min = this.convertToPercent(is_to_min ? o.to_min : o.min);
                to_max = this.convertToPercent(is_to_max ? o.to_max : o.max) - to_min;
                to_min = Slider.toFixed(to_min - (this.coords.p_handle / 100 * to_min));
                to_max = Slider.toFixed(to_max - (this.coords.p_handle / 100 * to_max));
                to_min = to_min + (this.coords.p_handle / 2);

                c.shad_to!.style.display = 'block';
                c.shad_to!.style.left = to_min + '%';
                c.shad_to!.style.width = to_max + '%';
            } else {
                c.shad_to!.style.display = 'none';
            }
        }
    }

    /**
     * Write values to input element
     */
    private writeToInput(): void {
        if (this.configuration.type === 'single') {
            if (this.configuration.values.length) {
                this.cache.input!.value = typeof this.result.from_value === "number" ? this.result.from_value.toString(10) : this.result.from_value;
            } else {
                this.cache.input!.value = this.result.from.toString(10);
            }
            this.cache.input!.dataset.from = this.result.from.toString(10);
        } else {
            if (this.configuration.values.length) {
                this.cache.input!.value = this.result.from_value + this.configuration.input_values_separator + this.result.to_value;
            } else {
                this.cache.input!.value = this.result.from + this.configuration.input_values_separator + this.result.to;
            }
            this.cache.input!.dataset.from = this.result.from.toString(10);
            this.cache.input!.dataset.to = this.result.to.toString(10);
        }
    }

    // =============================================================================================================
    // Callbacks
    // =============================================================================================================

    private callOnStart(): void {
        this.writeToInput();

        if (this.configuration.onStart && typeof this.configuration.onStart === 'function') {
            if (this.configuration.scope) {
                this.configuration.onStart.call(this.configuration.scope, this.result);
            } else {
                this.configuration.onStart(this.result);
            }
        }
    }

    private callOnChange(): void {
        this.writeToInput();

        if (this.configuration.onChange && typeof this.configuration.onChange === 'function') {
            if (this.configuration.scope) {
                this.configuration.onChange.call(this.configuration.scope, this.result);
            } else {
                this.configuration.onChange(this.result);
            }
        }
    }

    private callOnFinish(): void {
        this.writeToInput();

        if (this.configuration.onFinish && typeof this.configuration.onFinish === 'function') {
            if (this.configuration.scope) {
                this.configuration.onFinish.call(this.configuration.scope, this.result);
            } else {
                this.configuration.onFinish(this.result);
            }
        }
    }

    private callOnUpdate(): void {
        this.writeToInput();

        if (this.configuration.onUpdate && typeof this.configuration.onUpdate === 'function') {
            if (this.configuration.scope) {
                this.configuration.onUpdate.call(this.configuration.scope, this.result);
            } else {
                this.configuration.onUpdate(this.result);
            }
        }
    }

    // =============================================================================================================
    // Service methods
    // =============================================================================================================

    private toggleInput(): void {
        this.cache.input!.classList.toggle('irs-hidden-input');

        if (this.has_tab_index) {
            this.cache.input!.tabIndex = -1;
        } else {
            this.cache.input!.removeAttribute('tabindex');
        }

        this.has_tab_index = !this.has_tab_index;
    }

    /**
     * Convert real value to percent
     */
    private convertToPercent(value: number, no_min = false): number {
        const diapason = this.configuration.max - this.configuration.min,
            one_percent = diapason / 100;
        let val;

        if (!diapason) {
            this.no_diapason = true;
            return 0;
        }

        if (no_min) {
            val = value;
        } else {
            val = value - this.configuration.min;
        }

        return Slider.toFixed(val / one_percent);
    }

    /**
     * Convert percent to real values
     */
    private convertToValue(percent: number): number {
        let min = this.configuration.min,
            max = this.configuration.max,
            min_length, max_length,
            avg_decimals = 0,
            abs = 0;

        const min_decimals = min.toString().split('.')[1],
            max_decimals = max.toString().split('.')[1];

        if (percent === 0) {
            return this.configuration.min;
        }
        if (percent === 100) {
            return this.configuration.max;
        }


        if (min_decimals) {
            min_length = min_decimals.length;
            avg_decimals = min_length;
        }
        if (max_decimals) {
            max_length = max_decimals.length;
            avg_decimals = max_length;
        }
        if (min_length && max_length) {
            avg_decimals = (min_length >= max_length) ? min_length : max_length;
        }

        if (min < 0) {
            abs = Math.abs(min);
            min = +(min + abs).toFixed(avg_decimals);
            max = +(max + abs).toFixed(avg_decimals);
        }

        let number = ((max - min) / 100 * percent) + min,
            result;
        const string = this.configuration.step.toString().split('.')[1];

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
        let rounded = Math.round(percent / this.coords.p_step) * this.coords.p_step;

        if (rounded > 100) {
            rounded = 100;
        }
        if (percent === 100) {
            rounded = 100;
        }

        return Slider.toFixed(rounded);
    }

    private checkMinInterval(p_current, p_next, type): number {
        const o = this.configuration;
        let current;

        if (!o.min_interval) {
            return p_current;
        }

        current = this.convertToValue(p_current);
        const next = this.convertToValue(p_next);

        if (type === 'from') {

            if (next - current < o.min_interval) {
                current = next - o.min_interval;
            }

        } else {

            if (current - next < o.min_interval) {
                current = next + o.min_interval;
            }

        }

        return this.convertToPercent(current);
    }

    private checkMaxInterval(p_current, p_next, type): number {
        const o = this.configuration;
        let current;

        if (!o.max_interval) {
            return p_current;
        }

        current = this.convertToValue(p_current);
        const next = this.convertToValue(p_next);

        if (type === 'from') {

            if (next - current > o.max_interval) {
                current = next - o.max_interval;
            }

        } else {

            if (current - next > o.max_interval) {
                current = next + o.max_interval;
            }

        }

        return this.convertToPercent(current);
    }

    private checkDiapason(p_num: number, min: number, max: number) {
        let num = this.convertToValue(p_num);
        const o = this.configuration;

        if (typeof min !== 'number') {
            min = o.min;
        }

        if (typeof max !== 'number') {
            max = o.max;
        }

        if (num < min) {
            num = min;
        }

        if (num > max) {
            num = max;
        }

        return this.convertToPercent(num);
    }

    private static toFixed(num): number {
        num = num.toFixed(20);
        return +num;
    }
    
    private checkEdges(left: number, width: number): number {
        if (!this.configuration.force_edges) {
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
        let decorated = '';
        const o = this.configuration;

        if (o.prefix) {
            decorated += o.prefix;
        }

        decorated += num;

        if (o.max_postfix) {
            if (o.values.length && num === o.p_values[o.max]) {
                decorated += o.max_postfix;
                if (o.postfix) {
                    decorated += ' ';
                }
            } else if (original === o.max) {
                decorated += o.max_postfix;
                if (o.postfix) {
                    decorated += ' ';
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
        this.result.from_percent = this.convertToPercent(this.result.from);
        this.result.from_pretty = this._prettify(this.result.from);
        if (this.configuration.values) {
            this.result.from_value = this.configuration.values[this.result.from];
        }
    }

    private updateTo(): void {
        this.result.to = this.configuration.to;
        this.result.to_percent = this.convertToPercent(this.result.to);
        this.result.to_pretty = this._prettify(this.result.to);
        if (this.configuration.values) {
            this.result.to_value = this.configuration.values[this.result.to];
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

        let big_num = o.grid_num,
            small_max = 4,
            big_w = 0,
            small_w = 0,
            html = '',
            i, z, local_small_max, small_p, result;


        this.calcGridMargin();

        if (o.grid_snap) {
            big_num = total / o.step;
        }

        if (big_num > 50) big_num = 50;
        const big_p = Slider.toFixed(100 / big_num);

        if (big_num > 4) {
            small_max = 3;
        }
        if (big_num > 7) {
            small_max = 2;
        }
        if (big_num > 14) {
            small_max = 1;
        }
        if (big_num > 28) {
            small_max = 0;
        }

        for (i = 0; i < big_num + 1; i++) {
            local_small_max = small_max;

            big_w = Slider.toFixed(big_p * i);

            if (big_w > 100) {
                big_w = 100;
            }
            this.coords.big[i] = big_w;

            small_p = (big_w - (big_p * (i - 1))) / (local_small_max + 1);

            for (z = 1; z <= local_small_max; z++) {
                if (big_w === 0) {
                    break;
                }

                small_w = Slider.toFixed(big_w - (small_p * z));

                html += '<span class="irs-grid-pol small" style="left: ' + small_w + '%"></span>';
            }

            html += '<span class="irs-grid-pol" style="left: ' + big_w + '%"></span>';

            result = this.convertToValue(big_w);
            if (o.values.length) {
                result = o.p_values[result];
            } else {
                result = this._prettify(result);
            }

            html += '<span class="irs-grid-text js-grid-text-' + i + '" style="left: ' + big_w + '%">' + result + '</span>';
        }
        this.coords.big_num = Math.ceil(big_num + 1);


        this.cache.cont!.classList.toggle('irs-with-grid');
        this.cache.grid!.innerHTML = html;
        this.cacheGridLabels();
    }

    private cacheGridLabels(): void {
        let $label, i;
        const num = this.coords.big_num;

        for (i = 0; i < num; i++) {
            $label = this.cache.grid!.querySelector('.js-grid-text-' + i);
            if (!$label) {
                continue;
            }
            this.cache.grid_labels.push($label as HTMLHtmlElement);
        }

        this.calcGridLabels();
    }

    private calcGridLabels(): void {
        const start = [], finish = [], num = this.coords.big_num;
        let label, i;

        for (i = 0; i < num; i++) {
            this.coords.big_w[i] = Slider.outerWidth(this.cache.grid_labels[i], false);
            this.coords.big_p[i] = Slider.toFixed(this.coords.big_w[i] / this.coords.w_rs * 100);
            this.coords.big_x[i] = Slider.toFixed(this.coords.big_p[i] / 2);

            start[i] = Slider.toFixed(this.coords.big[i] - this.coords.big_x[i]);
            finish[i] = Slider.toFixed(start[i] + this.coords.big_p[i]);
        }

        if (this.configuration.force_edges) {
            if (start[0] < -this.coords.grid_gap) {
                start[0] = -this.coords.grid_gap;
                finish[0] = Slider.toFixed(start[0] + this.coords.big_p[0]);

                this.coords.big_x[0] = this.coords.grid_gap;
            }

            if (finish[num - 1] > 100 + this.coords.grid_gap) {
                finish[num - 1] = 100 + this.coords.grid_gap;
                start[num - 1] = Slider.toFixed(finish[num - 1] - this.coords.big_p[num - 1]);

                this.coords.big_x[num - 1] = Slider.toFixed(this.coords.big_p[num - 1] - this.coords.grid_gap);
            }
        }

        this.calcGridCollision(2, start, finish);
        this.calcGridCollision(4, start, finish);

        for (i = 0; i < num; i++) {
            label = this.cache.grid_labels[i];

            if (this.coords.big_x[i] !== Number.POSITIVE_INFINITY) {
                label.style.marginLeft = -this.coords.big_x[i] + '%';
            }
        }
    }

    private calcGridCollision(step, start, finish): void {
        let i, next_i, label;
        const num = this.coords.big_num;

        for (i = 0; i < num; i += step) {
            next_i = i + (step / 2);
            if (next_i >= num) {
                break;
            }

            label = this.cache.grid_labels[next_i];

            if (finish[i] <= start[next_i]) {
                label.style.visibility = 'visible';
            } else {
                label.style.visibility = 'hidden';
            }
        }
    }

    private calcGridMargin(): void {
        if (!this.configuration.grid_margin) {
            return;
        }

        this.coords.w_rs = Slider.outerWidth(this.cache.rs, false);
        if (!this.coords.w_rs) {
            return;
        }

        if (this.configuration.type === 'single') {
            this.coords.w_handle = Slider.outerWidth(this.cache.s_single, false);
        } else {
            this.coords.w_handle = Slider.outerWidth(this.cache.s_from, false);
        }
        this.coords.p_handle = Slider.toFixed(this.coords.w_handle / this.coords.w_rs * 100);
        this.coords.grid_gap = Slider.toFixed((this.coords.p_handle / 2) - 0.1);

        this.cache.grid!.style.width = Slider.toFixed(100 - this.coords.p_handle) + '%';
        this.cache.grid!.style.left = this.coords.grid_gap + '%';
    }

    private _prettify(value: number): string {
        return RangeSliderConfigurationUtil.prettify(this.configuration, value);
    }
    
    // =============================================================================================================
    // Public methods
    // =============================================================================================================

    update(options?: Partial<IRangeSliderConfiguration>): void {
        if (!this.input) {
            return;
        }

        this.is_update = true;

        this.configuration.from = this.result.from;
        this.configuration.to = this.result.to;
        this.update_check = {from: this.result.from, to: this.result.to};

        // this.configuration = Object.assign({}, this.configuration, options);
        this.configuration = RangeSliderConfigurationUtil.mergeConfigurations(this.configuration, options, this.update_check);
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
        this.cache.input!.readOnly = false;
        // this.input.dataset.ionRangeSlider = null;

        this.remove();
        this.input = undefined;
        this.configuration = undefined;
    }

    private unbindEvents(): void {
        if (this.no_diapason) {
            return;
        }

        this.cache.body.removeEventListener('touchmove', (e: TouchEvent) => this.pointerMove(e));
        this.cache.body.removeEventListener('mousemove', (e: MouseEvent) => this.pointerMove(e));
        this.cache.win.removeEventListener('touchend', (e: TouchEvent) => this.pointerUp(e));
        this.cache.win.removeEventListener('mouseup', (e: MouseEvent) => this.pointerUp(e));
        this.cache.line!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));
        this.cache.line!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
        this.cache.line!.removeEventListener('focus', (e: FocusEvent) => this.pointerFocus(e));

        if (this.configuration.drag_interval && this.configuration.type === 'double') {
            this.cache.bar!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown('both', e));
            this.cache.bar!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown('both', e));
        } else {
            this.cache.bar!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));
            this.cache.bar!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
        }

        if (this.configuration.type === 'single') {
            this.cache.single!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown('single', e));
            this.cache.s_single!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown('single', e));
            this.cache.shad_single!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));

            this.cache.single!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown('single', e));
            this.cache.s_single!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown('single', e));
            this.cache.shad_single!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));

            if (this.cache.edge) {
                this.cache.edge.removeEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
            }
        } else {
            this.cache.single!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown(null, e));
            this.cache.single!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown(null, e));

            this.cache.from!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown('from', e));
            this.cache.s_from!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown('from', e));
            this.cache.to!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown('to', e));
            this.cache.s_to!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerDown('to', e));
            this.cache.shad_from!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));
            this.cache.shad_to!.removeEventListener('touchstart', (e: TouchEvent) => this.pointerClick('click', e));

            this.cache.from!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown('from', e));
            this.cache.s_from!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown('from', e));
            this.cache.to!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown('to', e));
            this.cache.s_to!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerDown('to', e));
            this.cache.shad_from!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
            this.cache.shad_to!.removeEventListener('mousedown', (e: MouseEvent) => this.pointerClick('click', e));
        }

        if (this.configuration.keyboard) {
            this.cache.line!.removeEventListener('keydown', (e: KeyboardEvent) => this.key('keyboard', e));
        }

        if (Slider.getIsOldIe()) {
            this.cache.body.removeEventListener('mouseup', (e: MouseEvent) => this.pointerUp(e));
            this.cache.body.removeEventListener('mouseleave', e => this.pointerUp(e));
        }
    }
}
