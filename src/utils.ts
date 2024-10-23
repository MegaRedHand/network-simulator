// import { FederatedPointerEvent, Sprite } from "pixi.js";
// import { Device } from "./types/device";

// let lineStart: { device: Device; sprite: Sprite } = null;

// const deviceOnClick = (e: FederatedPointerEvent, device: Device) => {
//   console.log("clicked on device", e);
//   if (!e.altKey) {
//     return;
//   }
//   e.stopPropagation();
//   const sprite = e.currentTarget as Sprite;
//   if (lineStart === null) {
//     lineStart = { device, sprite };
//   } else {
//     if (
//       lineStart.device.connectTo(
//         device,
//         lineStart.sprite.x,
//         lineStart.sprite.y,
//         sprite.x,
//         sprite.y
//       )
//     ) {
//       lineStart = null;
//     }
//   }
// };
