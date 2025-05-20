import { GlobalContext } from "./../context";
import {
  DataNode,
  getNumberOfInterfaces,
  NetworkInterfaceData,
} from "./graphs/datagraph";
import { ViewDevice } from "./view-devices/";
import { Edge } from "./edge";
import { RightBar } from "../graphics/right_bar";
import { Packet } from "./packet";
import { DeviceType } from "./view-devices/vDevice";
import {
  UndoRedoManager,
  AddDeviceMove,
  RemoveDeviceMove,
  RemoveEdgeMove,
} from "./undo-redo";

type Selectable = ViewDevice | Edge | Packet;

let selectedElement: Selectable | null = null; // Global variable to store the selected element

export const urManager = new UndoRedoManager();

export function selectElement(element: Selectable) {
  deselectElement();

  if (element && element.isVisible()) {
    selectedElement = element;
    element.select();
  }
}

export function deselectElement() {
  if (selectedElement) {
    selectedElement.deselect();
    selectedElement = null;
    const rightBar = RightBar.getInstance();
    if (rightBar) {
      rightBar.clearContent();
    }
  }
}

export function isSelectedElementVisible(): boolean {
  if (selectedElement) {
    return selectedElement.isVisible();
  }
  return false;
}

export function refreshElement() {
  if (selectedElement) {
    // Deselect the current element and then reselect it to refresh
    selectedElement.deselect();
    selectedElement.select();
  }
}

export function isSelected(element: Selectable) {
  return element === selectedElement;
}

function isDevice(selectable: Selectable): selectable is ViewDevice {
  return selectable instanceof ViewDevice;
}

function isEdge(selectable: Selectable): selectable is Edge {
  return selectable instanceof Edge;
}

document.addEventListener("keydown", (event) => {
  // Check if the focus is on an input or textarea
  if (
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement
  ) {
    return; // Exit and do not execute shortcuts if the user is typing
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectedElement) {
      const viewgraph = !(selectedElement instanceof Packet)
        ? selectedElement.viewgraph
        : undefined;
      const currLayer = viewgraph?.getLayer();
      if (isDevice(selectedElement)) {
        const move = new RemoveDeviceMove(currLayer, selectedElement.id);
        urManager.push(viewgraph, move);
      } else if (isEdge(selectedElement)) {
        // if the edge is merged, do not delete it
        if (selectedElement.isMerged()) {
          return;
        }
        const ends = selectedElement.getDeviceIds();
        const move = new RemoveEdgeMove(currLayer, ends[0], ends[1]);
        urManager.push(viewgraph, move);
      } else {
        // its a packet
        selectedElement.delete();
      }
    }
  } else if (event.key === "c" || event.key === "C") {
    if (selectedElement instanceof ViewDevice) {
      selectedElement.selectToConnect();
      const connectButton = document.querySelector(".right-bar-connect-button");

      if (connectButton) {
        connectButton.classList.toggle("selected-button");
      }
    }
  }
});

function setUpDeviceInfo(ctx: GlobalContext, type: DeviceType): DataNode {
  const viewport = ctx.getViewport();
  // Get the center coordinates of the world after zoom
  const { x, y } = viewport.toWorld(
    viewport.screenWidth / 2,
    viewport.screenHeight / 2,
  );
  const mac = ctx.getNextMac();

  const interfaces = [];
  const numberOfInterfaces = getNumberOfInterfaces(type);

  const isSwitch = type == DeviceType.Switch;

  for (let i = 0; i < numberOfInterfaces; i++) {
    const mac = ctx.getNextMac();
    const iface: NetworkInterfaceData = { name: `eth${i}`, mac };
    if (!isSwitch) {
      iface.ip = ctx.getNextIp().ip;
    }
    interfaces.push(iface);
  }
  if (isSwitch) {
    return { x, y, type, mac, interfaces, switchingTable: [] };
  }
  const { ip, mask } = ctx.getNextIp();
  return { x, y, type, mac, ip, mask, interfaces, arpTable: [] };
}

// Function to add a device at the center of the viewport
export function addDevice(ctx: GlobalContext, type: DeviceType) {
  console.log(`Entered addDevice with ${type}`);
  const viewgraph = ctx.getViewGraph();

  const deviceInfo = setUpDeviceInfo(ctx, type);

  const move = new AddDeviceMove(viewgraph.getLayer(), deviceInfo);
  urManager.push(viewgraph, move);
}
