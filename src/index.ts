// Doing this includes the file in the build
import './style.css';

// Assets
import RouterSvg from './assets/router.svg';
import ConnectionSvg from './assets/connection.svg';
import HandPointer from './assets/hand_pointer.svg';

import { Application, Graphics, GraphicsContext, FederatedPointerEvent, EventSystem, PointData } from 'pixi.js';

import * as pixi_viewport from 'pixi-viewport';


const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;


// > context.ts

class GlobalContext {
    private mode: ModeStrategy = null;
    private viewport: Viewport = null;

    initialize(viewport: Viewport, mode: ModeStrategy) {
        this.viewport = viewport;
        this.setMode(mode);
    }

    getViewport() { return this.viewport; }

    getMode() { return this.mode; }

    setMode(mode: ModeStrategy) {
        this.mode = mode;
        this.mode.initialize(this);
    }
}

interface ModeStrategy {
    initialize(ctx: GlobalContext): void;
    clickViewport(ctx: GlobalContext, e: FederatedPointerEvent): void;
    clickCircle(ctx: GlobalContext, e: FederatedPointerEvent, circle: Circle): void;
}

class MoveMode implements ModeStrategy {
    initialize(ctx: GlobalContext) {
        ctx.getViewport().enableMovement();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clickViewport(ctx: GlobalContext, e: FederatedPointerEvent) {
        // do nothing
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clickCircle(ctx: GlobalContext, e: FederatedPointerEvent, circle: Circle) {
        // do nothing
    }
}

class RouterMode {
    initialize(ctx: GlobalContext) {
        ctx.getViewport().disableMovement();
    }

    clickViewport(ctx: GlobalContext, e: FederatedPointerEvent) {
        const position = ctx.getViewport().toWorld(e.global);
        const circle = new Circle(ctx, position);
        ctx.getViewport().addChild(circle);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clickCircle(ctx: GlobalContext, e: FederatedPointerEvent, circle: Circle) {
        // To avoid overlapping circles
        e.stopPropagation();
    }
}

class ConnectionMode {
    private selected: Circle = null;

    initialize(ctx: GlobalContext) {
        ctx.getViewport().disableMovement();
    }

    clickViewport(ctx: GlobalContext, e: FederatedPointerEvent) {
        e.stopPropagation();
    }

    clickCircle(ctx: GlobalContext, e: FederatedPointerEvent, circle: Circle) {
        e.stopPropagation();
        const selected = this.popSelected();

        if (selected === null) {
            this.selected = circle;
            return;
        }
        // TODO: this could be moved to a separate function/class
        const line = new Graphics()
            .moveTo(selected.x, selected.y)
            .lineTo(circle.x, circle.y)
            .stroke({ width: 2, color: 0 });
        line.zIndex = 1;
        ctx.getViewport().addChild(line);
    }

    // Private
    private popSelected() {
        const selected = this.selected;
        this.selected = null;
        return selected;
    }
}


// > graphics.ts

class Background extends Graphics {
    constructor() {
        super();
        this.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0xe3e2e1);
        this.zIndex = 0;
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
}

class Viewport extends pixi_viewport.Viewport {
    static usedPlugins = ['drag', 'pinch'];

    constructor(ctx: GlobalContext, events: EventSystem) {
        super({
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
            events: events,
        });
        this.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        this.sortableChildren = true;
        this.initializeMovement();

        this.addChild(new Background());

        // Circle and lines logic
        this.on('click', (e) => { ctx.getMode().clickViewport(ctx, e) });
    }

    private initializeMovement() {
        this.drag().pinch().wheel()
            .clamp({ direction: 'all' })
            // TODO: revisit when all icons are finalized
            .clampZoom({ minHeight: 200, minWidth: 200, maxWidth: WORLD_WIDTH / 5, maxHeight: WORLD_HEIGHT / 5 });
    }

    enableMovement() {
        for (const plugin of Viewport.usedPlugins) {
            this.plugins.resume(plugin);
        }
    }

    disableMovement() {
        for (const plugin of Viewport.usedPlugins) {
            this.plugins.pause(plugin);
        }
    }
}

class Circle extends Graphics {
    static graphicsContext = new GraphicsContext().circle(0, 0, 10).fill(0xff0000);

    constructor(ctx: GlobalContext, position: PointData) {
        super(Circle.graphicsContext);
        this.position = position;
        this.zIndex = 2;
        this.on('click', (e) => ctx.getMode().clickCircle(ctx, e, this));
        this.eventMode = 'static';
    }
}


// > left_bar.ts

class LeftBar {
    private leftBar: HTMLElement;

    constructor(leftBar: HTMLElement) {
        this.leftBar = leftBar;
    }
    static getFrom(document: Document) {
        return new LeftBar(document.getElementById('left-bar'));
    }

    addButton(src: string, onClick: () => void) {
        const button = document.createElement("button");
        button.classList.add("tool-button");

        button.onclick = onClick;
        this.leftBar.appendChild(button);

        const img = document.createElement("img");
        img.src = src;
        button.appendChild(img);
    }
}

// > right_bar.ts

class RightBar {
    private rightBar: HTMLElement;

    constructor(rightBar: HTMLElement) {
        this.rightBar = rightBar;
    }
    static getFrom(document: Document) {
        return new RightBar(document.getElementById('right-bar'));
    }
}


// > index.ts

// IIFE to avoid errors
(async () => {
    // Initialization
    const app = new Application();
    await app.init({ width: window.innerWidth, height: window.innerHeight, resolution: devicePixelRatio });

    const canvasPlaceholder = document.getElementById('canvas');
    canvasPlaceholder.replaceWith(app.canvas);

    // Context initialization
    const ctx = new GlobalContext();

    // Background container initialization
    const viewport = new Viewport(ctx, app.renderer.events);
    app.stage.addChild(viewport);

    // Left bar logic
    const leftBar = LeftBar.getFrom(document);

    // Add move button
    leftBar.addButton(HandPointer, () => { ctx.setMode(new MoveMode()) });

    // Add router button
    leftBar.addButton(RouterSvg, () => { ctx.setMode(new RouterMode()) });

    // Add connection button
    leftBar.addButton(ConnectionSvg, () => { ctx.setMode(new ConnectionMode()) });

    // Get right bar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rightBar = RightBar.getFrom(document);

    ctx.initialize(viewport, new MoveMode());

    // Ticker logic
    // app.ticker.add(() => { });

    // Resize logic
    function resize() {
        const width = app.renderer.canvas.width;
        const height = app.renderer.canvas.height;
        app.renderer.resize(width, height);
        viewport.resize(width, height);
    }
    resize();

    window.addEventListener('resize', resize);

    console.log("initialized!");
})();
