import { Application, Sprite, Assets } from 'pixi.js';
import Bunny from './bunny.png';
import './style.css';


// IIFE to avoid errors
(async () => {
    const button = document.createElement("button");
    button.textContent = "Open file";
    let fileContent = null;

    const input = document.createElement('input');
    input.type = 'file';

    button.onclick = () => {
        input.click();
    }
    document.body.appendChild(button);

    // The application will create a renderer using WebGL, if possible,
    // with a fallback to a canvas render. It will also setup the ticker
    // and the root stage PIXI.Container
    const app = new Application();

    // Wait for the Renderer to be available
    await app.init({ width: window.innerWidth, height: window.innerHeight, resolution: devicePixelRatio });

    // The application will create a canvas element for you that you
    // can then insert into the DOM
    document.body.appendChild(app.canvas);

    await Assets.load(Bunny);

    const bunny = Sprite.from(Bunny);

    // Setup the position of the bunny
    bunny.x = app.renderer.width / 2;
    bunny.y = app.renderer.height / 2;
    bunny.width = app.renderer.width / 2;
    bunny.height = app.renderer.height / 2;

    // Rotate around the center
    bunny.anchor.x = 0.5;
    bunny.anchor.y = 0.5;

    // Add the bunny to the scene we are building
    app.stage.addChild(bunny);

    // Listen for frame updates
    app.ticker.add(() => {
        // each frame we spin the bunny around a bit
        bunny.rotation += 0.01;
    });

    function resize() {
        // Resize the renderer
        app.renderer.resize(window.innerWidth, window.innerHeight);

        bunny.x = app.renderer.width / 2;
        bunny.y = app.renderer.height / 2;
        bunny.width = app.renderer.width / 2;
        bunny.height = app.renderer.height / 2;
    }

    window.addEventListener('resize', resize);

    input.onchange = () => {
        const file = input.files[0];

        console.log(file);
        // setting up the reader
        const reader = new FileReader();
        reader.readAsDataURL(file); // this is reading as data url

        // here we tell the reader what to do when it's done reading...
        reader.onload = async (readerEvent) => {
            fileContent = readerEvent.target.result; // this is the content!
            const txt = await Assets.load(fileContent);
            bunny.texture = txt;
        }
    }
})();
