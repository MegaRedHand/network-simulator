import { Application, Graphics, GraphicsContext, FederatedPointerEvent } from 'pixi.js';
import './style.css';


// IIFE to avoid errors
(async () => {
    // Initialization
    const app = new Application();

    await app.init({ width: window.innerWidth, height: window.innerHeight, resolution: devicePixelRatio });

    document.body.appendChild(app.canvas);

    let rect = new Graphics()
        .rect(0, 0, app.renderer.width, app.renderer.height)
        .fill(0xe3e2e1);

    const resizeRect = () => {
        rect.width = app.renderer.width;
        rect.height = app.renderer.height;
    }

    app.stage.addChild(rect);
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
            rect.addChildAt(line, 0);
            lineStart = null;
        }
    };

    rect.on('click', (e) => {
        console.log("clicked on rect", e);
        if (!e.altKey) {
            const circle = new Graphics(circleContext);
            circle.x = e.globalX;
            circle.y = e.globalY;
            rect.addChild(circle);
            circle.on('click', (e) => circleOnClick(e, circle));
            circle.eventMode = 'static';
        }
    });

    rect.eventMode = 'static';


    // Ticker logic

    app.ticker.add(() => { });


    // Resize logic

    function resize() {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        resizeRect();
    }

    window.addEventListener('resize', resize);
})();
