import { FederatedPointerEvent } from "pixi.js";
import { Device, DEVICE_SIZE } from "./device/device";

var lineStart: Device = null;

const deviceOnClick = (e: FederatedPointerEvent, device: Device) => {
  console.log("clicked on device", e);
  if (!e.altKey) {
    return;
  }
  e.stopPropagation();
  if (lineStart === null) {
    lineStart = device;
  } else {
    if (lineStart.connectTo(device)) {
      lineStart = null;
    }
  }
};

export const optionOnClick = (e: FederatedPointerEvent, device: Device) => {
  const newDevice = new Device(
    device.element.texture,
    device.stage,
    deviceOnClick,
    true
  );
  newDevice.resizeDevice(2, 2, DEVICE_SIZE + 15, DEVICE_SIZE);
};
