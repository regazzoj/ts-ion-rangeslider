[//]: # ()
[//]: # (## Installation - Browser)
[//]: # ()
[//]: # (```html)
[//]: # (<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ion-rangeslider/2.3.1/css/ion.rangeSlider.min.css"/>)
[//]: # (<script src="https://unpkg.com/ts-ion-rangeslider@0.1.0/dist/ts-ion-range-slider.min.js"></script>)
[//]: # (```)

## Description
* TsIonRangeSlider — cool, comfortable and easily customizable range slider with many options and skin support written in TypeScript without jQuery dependency, forked from <a href="https://github.com/IonDen/ion.rangeSlider" target="_blank">Ion.RangeSlider</a>
* Supports events and public methods, has flexible settings, can be completely altered with CSS
* Cross-browser: Google Chrome, Mozilla Firefox 3.6+, Opera 12+, Safari 5+, Internet Explorer 8+
* With this plugin you will be able to build beautiful range sliders, like this:

![ion.rangeSlider](_tmp/ion-range-slider.png)

## Key features
* Skin support. (6 skins included)
* Any number of sliders at one page without conflicts and big performance problems
* Two slider types single (1 slider) and double (2 sliders)
* Support of negative and fractional values
* Ability to set custom step and snap grid to step
* Support of custom values diapason
* Customisable grid of values
* Ability to disable UI elements (min and max, current value, grid)
* Postfixes and prefixes for your numbers ($20, 20 &euro; etc.)
* Additional postfix for maximum value (eg. $0 — $100<b>+</b>)
* Ability to prettify large numbers (eg. 10000000 -> 10 000 000 or 10.000.000)
* Slider writes its value right into input value field. This makes it easy to use in any html form
* Any slider value can be set through input data-attribute (eg. data-min="10")
* Slider supports disable param. You can set it true to make slider inactive
* Slider supports external methods (update, reset and remove) to control it after creation
* For advanced users slider has callbacks (onStart, onChange, onFinish, onUpdate). Slider pastes all its params to callback first argument as object
* Slider supports date and time


## Usage

### Browser
You can add directly the library to your HTML page with script tags :
* ts-range-slider.min.js

You also need to add following style sheet :
* ionRangeSlider.css

```html

<html lang=fr>
<head>
    ...
    <title>Amazing Web Site</title>
    <script src="js/bundle.js"></script>
    <link rel="stylesheet" type="text/css" href="style.css">
    ...
</head>
<body>
...
</body>
</html>
```

### Package Manager (NPM or Yarn)

* Install package according to the package manager you use : 
  * Installation command for `npm` =>

    ```bash
    npm i ts-rangeslider
    ```

  * Installation command for `yarn` =>

    ```bash
    yarn add ts-rangeslider
    ```

[//]: # (### NPM or YARN)

[//]: # (```bash)

[//]: # (./node_modules/ts-ion-rangeslider/dist/styles/ionRangeSlider.css)

[//]: # (```)
[//]: # (TODO dire comment importer le CSS après avoir publié le package)

## Initialisation

The slider overrides a native text <code>input</code> element.
```html
<input type="text" id="example_id" name="example_name" value="" />
```

To initialise the slider, call ionRangeSlider on the element:
```javascript
new TsIonRangeSlider.Slider(document.querySelector("#example_id"));
```

## Settings


| Option                 | Data-Attr                     | Defaults    | Type     | Description                                                                                                                                                         |
|------------------------|-------------------------------|-------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `skin`                 | `data-skin`                   | `flat`      | string   | Choose UI skin to use (flat, big, modern, round, sharp, square)                                                                                                     |
| `type`                 | `data-type`                   | `single`    | string   | Choose slider type, could be `single` - for one handle, or `double` for two handles                                                                                 |
| `min`                  | `data-min`                    | `10`        | number   | Set slider minimum value                                                                                                                                            |
| `max`                  | `data-max`                    | `100`       | number   | Set slider maximum value                                                                                                                                            |
| `from`                 | `data-from`                   | `undefined` | number   | Set start position for left handle (or for single handle)                                                                                                           |
| `to`                   | `data-to`                     | `undefined` | number   | Set start position for right handle                                                                                                                                 |
| `step`                 | `data-step`                   | `1`         | number   | Set sliders step. Always > 0. Could be fractional                                                                                                                   |
| `minInterval`          | `data-min-interval`           | `undefined` | number   | Set minimum diapason between sliders. Only for **double** type                                                                                                      |
| `maxInterval`          | `data-max-interval`           | `undefined` | number   | Set minimum maximum between sliders. Only for **double** type                                                                                                       |
| `dragInterval`         | `data-drag-interval`          | `false`     | boolean  | Allow user to drag whole range. Only for **double** type                                                                                                            |
| `values`               | `data-values`                 | `[]`        | array    | Set up your own array of possible slider values. They could be numbers or strings. If the values array is set up, min, max and step param, can no longer be changed |
| `fromFixed`            | `data-from-fixed`             | `false`     | boolean  | Fix position of left (or single) handle                                                                                                                             |
| `fromMin`              | `data-from-min`               | `undefined` | number   | Set minimum limit for left (or single) handle                                                                                                                       |
| `fromMax`              | `data-from-max`               | `undefined` | number   | Set maximum limit for left (or single) handle                                                                                                                       |
| `fromShadow`           | `data-from-shadow`            | `false`     | boolean  | Highlight the limits for left handle                                                                                                                                |
| `toFixed`              | `data-to-fixed`               | `false`     | boolean  | Fix position of right handle                                                                                                                                        |
| `toMin`                | `data-to-min`                 | `undefined` | number   | Set minimum limit for right handle                                                                                                                                  |
| `toMax`                | `data-to-max`                 | `undefined` | number   | Set maximum limit for right handle                                                                                                                                  |
| `toShadow`             | `data-to-shadow`              | `false`     | boolean  | Highlight the right handle                                                                                                                                          |
| `prettifyEnabled`      | `data-prettify-enabled`       | `true`      | boolean  | Improve readability of long numbers: 10000000 &rarr; 10 000 000                                                                                                     |
| `prettifySeparator`    | `data-prettify-separator`     | ` `         | string   | Set up your own separator for long numbers: 10000000 &rarr; 10,000,000 etc.                                                                                         |
| `prettify`             | `-`                           | `undefined` | function | Set up your own prettify function. Can be anything. For example, you can set up unix time as slider values and than transform them to cool looking dates            |
| `forceEdges`           | `data-force-edges`            | `false`     | boolean  | Sliders handles and tooltips will be always inside it's container                                                                                                   |
| `keyboard`             | `data-keyboard`               | `true`      | boolean  | Activates keyboard controls. Move left: &larr;, &darr;, A, S. Move right: &rarr;, &uarr;, W, D.                                                                     |
| `grid`                 | `data-grid`                   | `true`      | boolean  | Enables grid of values above the slider                                                                                                                             |
| `gridMargin`           | `data-grid-margin`            | `true`      | boolean  | Set left and right grid gaps                                                                                                                                        |
| `gridNum`              | `data-grid-num`               | `4`         | number   | Number of grid units                                                                                                                                                |
| `gridSnap`             | `data-grid-snap`              | `false`     | boolean  | Snap grid to sliders step (step param). If activated, gridNum will not be used. Max steps = 50                                                                      |
| `hideMinMax`           | `data-hide-min-max`           | `false`     | boolean  | Hides **min** and **max** labels                                                                                                                                    |
| `hideFromTo`           | `data-hide-from-to`           | `false`     | boolean  | Hides **from** and **to** labels                                                                                                                                    |
| `prefix`               | `data-prefix`                 | `undefined` | string   | Set prefix for values. Will be set up right before the number: **$**100                                                                                             |
| `postfix`              | `data-postfix`                | `undefined` | string   | Set postfix for values. Will be set up right after the number: 100**k**                                                                                             |
| `maxPostfix`           | `data-max-postfix`            | `undefined` | string   | Special postfix, used only for maximum value. Will be showed after handle will reach maximum right position. For example **0 — 100+**                               |
| `decorateBoth`         | `data-decorate-both`          | `true`      | boolean  | Used for **double** type and only if prefix or postfix was set up. Determine how to decorate close values. For example: **$10k — $100k** or **$10 — 100k**          |
| `valuesSeparator`      | `data-decorate-both`          | ` - `       | string   | Set your own separator for close values. Used for **double** type. Default: **10 — 100**. Or you may set: **10 to 100, 10 + 100, 10 &rarr; 100** etc.               |
| `inputValuesSeparator` | `data-input-values-separator` | ` ; `       | string   | Separator for **double** values in input value property. `<input value="25;42">`                                                                                    |
| `disable`              | `data-disable`                | `false`     | boolean  | Locks slider and makes it inactive. Input is disabled too. Invisible to forms                                                                                       |
| `block`                | `data-blokc`                  | `false`     | boolean  | Locks slider and makes it inactive. Input is NOT disabled. Can be send with forms                                                                                   |
| `extraClasses`         | `data-extra-classes`          | `undefined` | string   | Traverse extra CSS-classes to sliders container                                                                                                                     |
| `scope`                | `-`                           | `undefined` | object   | Scope for callbacks. Pass any object                                                                                                                                |
| `onStart`              | `-`                           | `undefined` | function | Callback. Is called on slider start. Gets all slider data as a 1st attribute                                                                                        |
| `onChange`             | `-`                           | `undefined` | function | Callback. IS called on each values change. Gets all slider data as a 1st attribute                                                                                  |
| `onFinish`             | `-`                           | `undefined` | function | Callback. Is called when user releases handle. Gets all slider data as a 1st attribute                                                                              |
| `onUpdate`             | `-`                           | `undefined` | function | Callback. Is called when slider is modified by external methods `update` or `reset`                                                                                 |



## Description of data passed to callbacks (onChange and etc.)
Result is object type and passed to callback as first argument:
```javascript
var callbackData = {
    "input": Object,            // DOM element linked to input
    "slider": Object,           // DOM element linked to sliders container
    "min": 1000,                // MIN value
    "max": 100000,              // MAX values
    "from": 10000,              // FROM value
    "fromPercent": 10,         // FROM value in percents
    "fromValue": 0,            // FROM value of array values (if used)
    "to": 90000,                // TO value
    "toPercent": 90,           // TO value in percents
    "toValue": 0,              // TO value of array values (if used)
    "minPretty": "1 000",      // MIN prettified (if used)
    "maxPretty": "100 000",    // MAX prettified (if used)
    "fromPretty": "10 000",    // FROM prettified (if used)
    "toPretty": "90 000"       // TO prettified (if used)
}
```

## Creating slider (all params)
An example of a customised slider:
```javascript
const input = document.querySelector('#example');
new TsRangeSlider(input, {
    skin: "big",
    min: 0,
    max: 10000,
    from: 1000,
    to: 9000,
    type: 'double',
    prefix: "$",
    grid: true,
    gridNum: 10
});
```

You can also initialise slider with <code>data-*</code> attributes of input tag:
```html
data-min="0"
data-max="10000"
data-from="1000"
data-to="9000"
data-type="double"
data-prefix="$"
data-grid="true"
data-grid-num="10"
```

## Public methods

To use public methods, at first you must save slider instance to variable:
```javascript
// Launch plugin
const input = document.querySelector('#example');
let sliderInputElement = new TsIonRangeSlider.Slider(input, {
    skin            : 'round',
    grid            : true,
    gridMargin      : true,
    gridNum         : 4,
    gridSnap        : false,
    hideFromTo      : false,
    hideMinMax      : false,
    onChange        : obj => console.log(obj),
    onFinish        : obj => console.log(obj),
    onStart         : obj => console.log(obj),
    onUpdate        : obj => console.log(obj),
    type            : 'double',
    values          : ['a', 'b', 'c'],
    valuesSeparator : ','
  });
  sliderInputElement.update({
    values: ['a', 'b', 'c', 'd'],
  });
  sliderInputElement.reset();
  sliderInputElement.destroy();
```

There are 3 public methods:
```javascript
// UPDATE - updates slider to any new values
slider.update({
    from: 300,
    to: 400
});

// RESET - reset slider to it's first values
slider.reset();

// DESTROY - destroys slider and restores original input field
slider.destroy();
```
