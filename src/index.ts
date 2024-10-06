import { Application, Graphics, GraphicsContext, FederatedPointerEvent, Container } from 'pixi.js';
import './style.css';


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


    // Circle and lines logic
    const circleContext = new GraphicsContext().circle(0, 0, 10).fill(0xff0000);

    let lineStart: { x: number, y: number } = null;

    const circleOnClick = (e: FederatedPointerEvent, circle: Graphics) => {
        console.log("clicked on circle", e);
        if (!e.altKey) {
            return;
        }
        e.stopPropagation();
        if (lineStart === null) {
            lineStart = { x: circle.x, y: circle.y };
        } else {
            const line = new Graphics()
                .moveTo(lineStart.x, lineStart.y)
                .lineTo(circle.x, circle.y)
                .stroke({ width: 2, color: 0 });
            line.zIndex = 1;
            viewport.addChild(line);
            lineStart = null;
        }
    };

    viewport.on('click', (e) => {
        console.log("clicked on viewport", e);
        if (!e.altKey) {
            const circle = new Graphics(circleContext);
            circle.x = e.globalX;
            circle.y = e.globalY;
            circle.zIndex = 2;
            viewport.addChild(circle);
            circle.on('click', (e) => circleOnClick(e, circle));
            circle.eventMode = 'static';
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
