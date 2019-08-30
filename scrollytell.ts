/**
 * @license
 * Copyright 2019 Google LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * The immutable configuration that describes a single story.
 */
interface IConfig {
    readonly chartSelector?: string;
    readonly containerSelector: string;
    readonly developerHud?: boolean;
    readonly enterHandler?: (story: Story, panel: number) => void;
    readonly exitHandler?: (story: Story, panel: number) => void;
    readonly fullsizeChart?: boolean;
    readonly panelSelector: string;
    readonly progressHandler?: (story: Story, progress: number) => void;
    readonly segmentSelector?: string;
}

/**
 * The context for all animation corresponding to a container element.
 */
export class Story {
    private activePanelIndex: number;
    private readonly chart: HTMLElement;
    private readonly config: IConfig;
    private readonly container: HTMLElement;
    private developerHudCanvas: HTMLCanvasElement;
    private developerHudContext: CanvasRenderingContext2D;
    private frameCount: number;
    private readonly panels: NodeListOf<HTMLElement>;
    private progressValue: number;
    private scrollTop: number;
    private readonly tick: () => void;

    public constructor(config: IConfig) {
        this.config = config;
        this.activePanelIndex = -1;
        this.progressValue = -1;
        this.frameCount = 0;

        this.container = document.querySelector(config.containerSelector);
        if (!this.container) {
            throw Error("Scrollytell container not found.");
        }

        const cstyle = window.getComputedStyle(this.container);
        if (cstyle.getPropertyValue("overflow-y") !== "scroll") {
            throw Error("Scrollytell container must have overflow-y:scroll.");
        }
        if (cstyle.getPropertyValue("position") !== "relative") {
            throw Error("Scrollytell container must have position:relative.");
        }

        this.panels = document.querySelectorAll(config.panelSelector);
        if (!this.panels) {
            throw Error("Scrollytell panels not found.");
        }

        this.chart = document.querySelector(config.chartSelector);
        if (config.fullsizeChart && !this.chart) {
            throw Error("Scrollytell chart not found.");
        }

        if (config.fullsizeChart) {
            const height = this.container.getBoundingClientRect().height;
            this.chart.style.height = `${height}px`;
            this.chart.style.top = "0";
            const segments: NodeListOf<HTMLElement> = document.querySelectorAll(config.segmentSelector);
            for (const segment of segments) {
                segment.style.height = `${height}px`;
            }
        }

        if (config.developerHud) {
            this.showDeveloperHud(true);
        }

        this.tick = this.render.bind(this) as (() => void);

        window.requestAnimationFrame(this.tick);
    }

    /**
     * Returns the zero-based index of the panel that is currently overlapping
     * the guideline. Returns -1 if no such panel exists.
     */
    public getActivePanelIndex() {
        return this.activePanelIndex;
    }

    /**
     * Returns a percentage in the range [0, 1] that represents the position of
     * the active panel relative to the guideline. Returns 0 when the top of the
     * panel aligns with the guideline, +1 when the bottom of the panel aligns
     * with the guideline, and -1 if no panel is overlapping the guideline.
     */
    public getProgressValue() {
        return this.progressValue;
    }

    /**
     * Toggles the heads-up-display for development purposes. Do not enable
     * when your site is in production.
     */
    public showDeveloperHud(enable: boolean) {
        if (this.developerHudCanvas) {
            const visibility = enable ? "visible" : "hidden";
            this.developerHudCanvas.style.visibility = visibility;
            return;
        }
        if (!enable) {
            return;
        }
        const canvas = document.createElement("canvas");
        const style = canvas.style;
        style.position = "fixed";
        style.width = "100%";
        style.height = "100%";
        style.left = "0";
        style.top = "0";
        style.zIndex = "100";
        style.pointerEvents = "none";
        this.container.appendChild(canvas);

        const dpr = window.devicePixelRatio;
        canvas.width = canvas.clientWidth * dpr;
        canvas.height = canvas.clientHeight * dpr;
        this.developerHudContext = canvas.getContext("2d");
        this.developerHudContext.scale(dpr, dpr);
        this.developerHudCanvas = canvas;
        const family = "'Lexend Deca', sans-serif";
        this.developerHudContext.font = `bold 14px ${family}`;

        // Force a redraw on the next frame.
        this.scrollTop = undefined;
    }

    private render() {
        // Take care not to do work if no scrolling has occurred. This is an
        // important optimization because it can save power on mobile devices.
        const scrollTop = this.container.scrollTop;
        if (scrollTop === this.scrollTop) {
            window.requestAnimationFrame(this.tick);
            return;
        }
        this.scrollTop = scrollTop;

        // Determine the guideline Y coordinate.
        const cbox = this.container.getBoundingClientRect();
        const guideline = (cbox.top + cbox.bottom) / 2;

        // Determine the active panel and progress value.
        const prevActivePanel = this.activePanelIndex;
        const prevProgressValue = this.progressValue;
        this.activePanelIndex = -1;
        this.progressValue = -1;
        for (const [index, panel] of this.panels.entries()) {
            const pbox = panel.getBoundingClientRect();
            const outside = pbox.top > guideline || pbox.bottom < guideline;
            const active = !outside;
            const ratio = (guideline - pbox.top) / pbox.height;
            if (active) {
                this.activePanelIndex = index;
                this.progressValue = ratio;
                break;
            }
        }

        const panelChanged = prevActivePanel !== this.activePanelIndex;
        const progressChanged = prevProgressValue !== this.progressValue;

        // Trigger scrollytelling events.
        if (panelChanged) {
            if (this.config.exitHandler) {
                this.config.exitHandler(this, prevActivePanel);
            }
            if (this.config.enterHandler) {
                this.config.enterHandler(this, this.activePanelIndex);
            }
        }

        // Do not update the frame count when scrolling between panels (i.e.
        // when there is no active panel).
        if (progressChanged || panelChanged) {
            this.frameCount += 1;
            if (this.config.progressHandler) {
                this.config.progressHandler(this, this.progressValue);
            }
        }

        // Render the developer HUD even when the frame count has not been
        // incremented (i.e. activePanelIndex == -1) because the relative
        // position of the panel bounding / boxes may have changed.
        if (this.developerHudContext) {
            this.renderDeveloperHud(cbox);
        }

        window.requestAnimationFrame(this.tick);
    }

    private renderDeveloperHud(containerBox: ClientRect) {
        const cbox = containerBox;
        const ctx = this.developerHudContext;
        const guideline = (cbox.top + cbox.bottom) / 2;
        const width = this.developerHudCanvas.width;
        const height = this.developerHudCanvas.height;

        // Make the canvas transparent before drawing anything.
        ctx.clearRect(0, 0, width, height);

        // Draw semitransparent gray rectangles over each panel.
        ctx.beginPath();
        ctx.fillStyle = "rgba(128, 128, 128, 0.125)";
        for (const [index, panel] of this.panels.entries()) {
            const pbox = panel.getBoundingClientRect();
            ctx.rect(pbox.left, pbox.top, pbox.width, pbox.height);
        }
        ctx.fill();

        // Draw a semitransparent white background rect under the text.
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.rect(0, 0, 200, 100);
        ctx.fill();

        // Draw the text.
        ctx.fillStyle = "rgba(50, 50, 0, 1)";
        const pvText = `progress value = ${this.progressValue.toFixed(2)}`;
        ctx.fillText(pvText, 10, 20);
        const panelText = `active panel = ${this.activePanelIndex}`;
        ctx.fillText(panelText, 10, 40);
        const frameText = `frame count = ${this.frameCount}`;
        ctx.fillText(frameText, 10, 60);

        // Draw the guideline.
        ctx.strokeStyle = "rgba(255, 255, 255, 1.0)";
        ctx.beginPath();
        ctx.moveTo(cbox.left, guideline - 1);
        ctx.lineTo(cbox.right, guideline - 1);
        ctx.moveTo(cbox.left, guideline + 1);
        ctx.lineTo(cbox.right, guideline + 1);
        ctx.stroke();
        ctx.strokeStyle = "rgba(0, 0, 0, 1.0)";
        ctx.setLineDash([10, 1]);
        ctx.beginPath();
        ctx.moveTo(cbox.left, guideline);
        ctx.lineTo(cbox.right, guideline);
        ctx.stroke();
    }
}
