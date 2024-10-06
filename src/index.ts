import { Application, Graphics, GraphicsContext, FederatedPointerEvent, Container } from 'pixi.js';
import './style.css';


class GlobalContext {
    selected: Circle = null;
    viewport: Container;

    constructor(viewport: Container) {
        this.viewport = viewport;
    }

    popSelected() {
        const selected = this.selected;
        this.selected = null;
        return selected;
    }
}

class Circle extends Graphics {
    static graphicsContext = new GraphicsContext().circle(0, 0, 10).fill(0xff0000);

    constructor(ctx: GlobalContext, x: number, y: number) {
        super(Circle.graphicsContext);
        this.x = x;
        this.y = y;
        this.zIndex = 2;
        this.on('click', (e) => this.onClick(ctx, e));
        this.eventMode = 'static';
    }

    onClick(ctx: GlobalContext, e: FederatedPointerEvent) {
        console.log("clicked on circle", e);
        if (!e.altKey) {
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

// IIFE to avoid errors
(async () => {
    // Initialization
    const app = new Application();

    await app.init({ width: window.innerWidth, height: window.innerHeight, resolution: devicePixelRatio });

    document.body.appendChild(app.canvas);


    // Background container initialization
    const viewport = new Container();

    const resizeViewport = () => {
        viewport.width = app.renderer.width;
        viewport.height = app.renderer.height;
    }

    viewport.sortableChildren = true;
    app.stage.addChild(viewport);
    resizeViewport();


    // Background initialization
    let rect = new Graphics()
        .rect(0, 0, app.renderer.width, app.renderer.height)
        .fill(0xe3e2e1);

    const resizeRect = () => {
        rect.width = app.renderer.width;
        rect.height = app.renderer.height;
    }

    rect.zIndex = 0;

    viewport.addChild(rect);
    resizeRect();


    // Context initialization
    const ctx = new GlobalContext(viewport);


    // Circle and lines logic
    viewport.on('click', (e) => {
        console.log("clicked on viewport", e);
        if (!e.altKey) {
            const circle = new Circle(ctx, e.globalX, e.globalY);
            viewport.addChild(circle);
        }
    });

    viewport.eventMode = 'static';

    console.log("initialized!");


    // Ticker logic

    app.ticker.add(() => { });


    // Resize logic

    function resize() {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        resizeRect();
        resizeViewport();
    }

    window.addEventListener('resize', resize);
})();
