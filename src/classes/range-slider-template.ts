import {SkinType} from "../enums";

export class RangeSliderTemplate {
    static readonly containerHtml = (skin: SkinType, count: number, extraClasses: string): string => `<span class="irs irs--${skin} js-irs-${count}${extraClasses.length>0?` ${extraClasses}`:""}"></span>`;

    static readonly baseHtml =
        `<span class="irs">
            <span class="irs-line" tabindex="0"></span>
            <span class="irs-min">0</span>
            <span class="irs-max">1</span>
            <span class="irs-from">0</span>
            <span class="irs-to">0</span>
            <span class="irs-single">0</span>
        </span>
        <span class="irs-grid"></span>`;

    static readonly singleHtml =
        `<span class="irs-bar irs-bar--single"></span>
        <span class="irs-shadow shadow-single"></span>
        <span class="irs-handle single">
            <i></i>
            <i></i>
            <i></i>
        </span>`;

    static readonly doubleHtml =
        `<span class="irs-bar"></span>
        <span class="irs-shadow shadow-from"></span>
        <span class="irs-shadow shadow-to"></span>
        <span class="irs-handle from">
            <i></i>
            <i></i>
            <i></i>
        </span>
        <span class="irs-handle to">
            <i></i>
            <i></i>
            <i></i>
        </span>`;

    static readonly disableHtml = `<span class="irs-disable-mask"></span>`;
}