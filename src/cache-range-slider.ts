export class Template {
    static readonly base_html =
        '<span class="irs">' +
        '<span class="irs-line" tabindex="0"></span>' +
        '<span class="irs-min">0</span><span class="irs-max">1</span>' +
        '<span class="irs-from">0</span><span class="irs-to">0</span><span class="irs-single">0</span>' +
        '</span>' +
        '<span class="irs-grid"></span>';

    static readonly single_html =
        '<span class="irs-bar irs-bar--single"></span>' +
        '<span class="irs-shadow shadow-single"></span>' +
        '<span class="irs-handle single"><i></i><i></i><i></i></span>';

    static readonly double_html =
        '<span class="irs-bar"></span>' +
        '<span class="irs-shadow shadow-from"></span>' +
        '<span class="irs-shadow shadow-to"></span>' +
        '<span class="irs-handle from"><i></i><i></i><i></i></span>' +
        '<span class="irs-handle to"><i></i><i></i><i></i></span>';

    static readonly disable_html = '<span class="irs-disable-mask"></span>';
}

export interface ICacheRangeSlider {
    bar: HTMLHtmlElement | null;
    body: HTMLElement;
    cont: Element | null;
    edge: HTMLHtmlElement | null;
    from: HTMLHtmlElement | null;
    grid_labels: HTMLHtmlElement[];
    grid: HTMLHtmlElement | null;
    input?: HTMLInputElement;
    line: HTMLHtmlElement | null;
    min: HTMLHtmlElement | null;
    max: HTMLHtmlElement | null;
    rs: HTMLHtmlElement | null;
    s_from: HTMLHtmlElement | null;
    s_single: HTMLHtmlElement | null;
    s_to: HTMLHtmlElement | null;
    shad_from: HTMLHtmlElement | null;
    shad_single: HTMLHtmlElement | null;
    shad_to: HTMLHtmlElement | null;
    single: HTMLHtmlElement | null;
    to: HTMLHtmlElement | null;
    win: Window;
}