## scrollytell

This repo provides a tiny library to help web developers create animations that
synchronize with the page's scroll position. It uses `requestAnimationFrame`
to check the scroll status and trigger scrollytelling events.

Check out the mobile-friendly [examples][1] that can be used as templates.

Before going over the API, let's establish a vocabulary.

<dl>
    <dt>chart</dt>
    <dd>
        An area within the container designated for data visualization that uses
        <code>sticky</code> or <code>fixed</code> positioning. Typically this is
        an <code>&lt;svg&gt;</code> or <code>&lt;canvas&gt;</code> and has a low
        <code>z-order</code> to allow explanatory text to flow over.
        <br><br>
        <p>
        Not all scrollytell stories have charts. For example, the visualization
        area might be external to the container, although this could be hard to
        manage for small screens.
        </p>
    </dd>
    <dt>container</dt>
    <dd>
        The outermost DOM element of concern for a single scrollytell story.
        Style must include <code>overflow-y: scroll</code> and
        <code>position: relative</code>.
    </dd>
    <dt>developer HUD</dt>
    <dd>
        Heads-up-display for development purposes. This is an overlay over the
        container that displays the guideline, active panel index, and progress
        value. It also draws semitransparent boxes over each panel's bounding
        box.
    </dd>
    <dt>fullsize chart</dt>
    <dd>
        Special configuration where the chart has the same height as the browser
        window.
    </dd>
    <dt>guideline</dt>
    <dd>
        Virtual line stretched horizontally over the middle of the container and
        does not scroll with its content. As panels cross the guideline they
        trigger scrollytell events.
    </dd>
    <dt>panel</dt>
    <dd>
        One of several block-level DOM elements that form a scrollytelling
        sequence. Panels trigger scrollytell events as they cross the guideline.
        The <i>active panel</i> is the panel that currently overlaps the
        guideline. Long panels may contain <i>segments</i> that vertically
        divide the panel into multiple pieces, but do not trigger scrollytell
        events.
    </dd>
    <dt>progress value</dt>
    <dd>
        Percentage in [0,1] that represents the vertical position of the active
        panel relative to the guideline. When the top of the panel aligns with
        the guideline, the progress value is 0. When the bottom of the panel
        aligns with the guideline, the progress value is 1.
    </dd>
    <dt>story</dt>
    <dd>
        The context for a scrollytell animation. Corresponds to a specific
        container element.
    </dd>
</dl>

<img src="legend.png" width="553" height="379">

## API

To use the scrollytell library, create a `Story` object and pass in your
configuration. The config contains event handlers and querySelector strings. The
only two fields that are absolutely required are `containerSelector` (which
should select a single DOM element) and `panelSelector` (which should select
several DOM elements).

To make a useful story, you'll probably want to provide `enterHandler` and
`exitHandler`, which are triggered during [requestAnimationFrame][2] when a
panel crosses in or out of the guideline.

For continuous-style scrollytelling, you can provide a `progressHandler` which
is triggered every time the progress value changes or the active panel changes.
Instead of writing your own render loop, you can put your drawing code in the
progress handler. This saves power on mobile devices because it only does work
when the scroll position changes.

Here's an example:

```js
import { Story } from "./scrollytell";

new Story({
    containerSelector: ".container",
    panelSelector: ".panels p",
    developerHud: true, // <-- disable this in production!
    enterHandler: (story, panel) => {
        console.info(`Entered panel ${panel}`);
    },
    exitHandler: (story, panel) => {
        console.info(`Exited panel ${panel}`);
    },
    progressHandler: (story, progress) => {
        const percentage = (100 * progress).toFixed(2);
        console.info(`Progress is now ${percentage}%`);
    }
});
```

If you want the chart to encompass the background of the container, you can
include a `chartSelector` field in the config and set `fullsizeChart` to true.

Additionally, the `Story` object exposes a few methods:

```ts
/**
 * Returns the zero-based index of the panel that is currently overlapping
 * the guideline. Returns -1 if no such panel exists.
 */
getActivePanelIndex(): number;

/**
 * Returns a percentage in the range [0, 1] that represents the position of
 * the active panel relative to the guideline. Returns 0 when the top of the
 * panel aligns with the guideline, +1 when the bottom of the panel aligns
 * with the guideline, and -1 if no panel is overlapping the guideline.
 */
getProgressValue(): number;

/**
 * Toggles the heads-up-display for development purposes. Do not enable
 * when your site is in production.
 */
showDeveloperHud(enable: boolean): void;

```

For more information check out the [examples][1] and the [TypeScript source][3].

## Issues

Because of its focus on mobile platforms, currently the scrollytell library does
not gracefully handle situations where the container is resized by the user
(e.g. if the container expands to fill a browser window). This may be fixed in
the future.

## Other resources

For step-by-step storytelling, take a look at [AMP Stories][4]. See also
Mike Bostock's post [How to Scroll][5].

## Disclaimer

This is not an officially supported Google product.

[1]: https://google.github.io/scrollytell/examples
[2]: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
[3]: https://github.com/google/scrollytell/raw/master/scrollytell.ts
[4]: https://amp.dev/about/stories/
[5]: https://bost.ocks.org/mike/scroll/
