// Doing this includes the file in the build
import './style.css';

import { Application, Graphics, GraphicsContext, FederatedPointerEvent, Container, EventSystem, PointData } from 'pixi.js';
import RouterSvg from './assets/router.svg';
import ConnectionSvg from './assets/connection.svg';
import * as pixi_viewport from 'pixi-viewport';


const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;


class GlobalContext {
    // TODO: merge mode and selected fields
    mode: string = "router";
    selected: Circle = null;

    viewport: Container = null;

    popSelected() {
        const selected = this.selected;
        this.selected = null;
        return selected;
    }

    setViewport(viewport: Container) {
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
        if (ctx.mode != "connection") {
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

    // Circle and lines logic
    viewport.on('click', (e) => {
        if (ctx.mode == "router") {
            const position = viewport.toWorld(e.client);
            const circle = new Circle(ctx, position);
            viewport.addChild(circle);
        }
    });

    // Left bar logic
    const leftBar = document.getElementById('left-bar');

    // Router
    const routerButton = document.createElement("button");
    routerButton.classList.add("tool-button");

    routerButton.onclick = () => {
        ctx.mode = "router";
    }
    leftBar.appendChild(routerButton);

    const routerImg = document.createElement("img");
    routerImg.src = RouterSvg;
    routerButton.appendChild(routerImg);

    // Connection
    const connectionButton = document.createElement("button");
    connectionButton.classList.add("tool-button");

    connectionButton.onclick = () => {
        ctx.mode = "connection";
    }
    leftBar.appendChild(connectionButton);

    const connectionImg = document.createElement("img");
    connectionImg.src = ConnectionSvg;
    connectionButton.appendChild(connectionImg);

    // Ticker logic
    app.ticker.add(() => { });

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
