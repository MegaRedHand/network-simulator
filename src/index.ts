// Doing this includes the file in the build
import './style.css';

import { Application, Graphics, GraphicsContext, FederatedPointerEvent, EventSystem, PointData } from 'pixi.js';
import RouterSvg from './assets/router.svg';
import ConnectionSvg from './assets/connection.svg';
import * as pixi_viewport from 'pixi-viewport';


const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;


enum CursorMode {
    Router,
    Connection,
}


class GlobalContext {
    // TODO: merge mode and selected fields into strategy class
    mode: CursorMode = CursorMode.Router;
    selected: Circle = null;

    viewport: Viewport = null;

    popSelected() {
        const selected = this.selected;
        this.selected = null;
        return selected;
    }

    setViewport(viewport: Viewport) {
        this.viewport = viewport;
    }
}

class Circle extends Graphics {
    static graphicsContext = new GraphicsContext().circle(0, 0, 10).fill(0xff0000);

    constructor(ctx: GlobalContext, position: PointData) {
        super(Circle.graphicsContext);
        this.position = position;
        this.zIndex = 2;
        this.on('click', (e) => this.onClick(ctx, e));
        this.eventMode = 'static';
    }

    onClick(ctx: GlobalContext, e: FederatedPointerEvent) {
        if (ctx.mode != CursorMode.Connection) {
            return;
        }
        e.stopPropagation();
        const selected = ctx.popSelected();

        if (selected === null) {
            ctx.selected = this;
        } else {
            // TODO: this could be moved to a separate function/class
            const line = new Graphics()
                .moveTo(selected.x, selected.y)
                .lineTo(this.x, this.y)
                .stroke({ width: 2, color: 0 });
            line.zIndex = 1;
            ctx.viewport.addChild(line);
        }
    }
}

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

class RightBar {
    private rightBar: HTMLElement;

    constructor(rightBar: HTMLElement) {
        this.rightBar = rightBar;
    }
    static getFrom(document: Document) {
        return new RightBar(document.getElementById('right-bar'));
    }
}

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
    constructor(ctx: GlobalContext, events: EventSystem) {
        super({
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
            events: events,
        });
        this.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        this.sortableChildren = true;
        ctx.setViewport(this);
        this.drag().pinch().wheel()
            .clamp({ direction: 'all' })
            // TODO: revisit when all icons are finalized
            .clampZoom({ minHeight: 200, minWidth: 200, maxWidth: WORLD_WIDTH / 5, maxHeight: WORLD_HEIGHT / 5 });

        this.addChild(new Background());

        // Circle and lines logic
        this.on('click', (e) => {
            if (ctx.mode == CursorMode.Router) {
                const position = this.toWorld(e.global);
                const circle = new Circle(ctx, position);
                this.addChild(circle);
            }
        });
    }
}

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

    // Add router button
    leftBar.addButton(RouterSvg, () => {
        ctx.mode = CursorMode.Router;
    });

    // Add connection button
    leftBar.addButton(ConnectionSvg, () => {
        ctx.mode = CursorMode.Connection;
    });

    // Get right bar
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rightBar = RightBar.getFrom(document);

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
