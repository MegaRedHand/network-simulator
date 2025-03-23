import RouterSvg from "../assets/router.svg";
import ComputerSvg from "../assets/pc.svg";
import SwitchSvg from "../assets/switch.svg";
import { addDevice } from "../types/viewportManager";
import { GlobalContext } from "../context";
import { DeviceType } from "../types/view-devices/vDevice";
import { Layer, layerFromName } from "../types/layer";

export class LeftBar {
  private leftBar: HTMLElement;
  private ctx: GlobalContext;

  constructor(leftBar: HTMLElement, ctx: GlobalContext) {
    this.leftBar = leftBar;
    this.ctx = ctx;
  }

  static getFrom(document: Document, ctx: GlobalContext) {
    return new LeftBar(document.getElementById("left-bar"), ctx);
  }

  private addButton(src: string, onClick: () => void, label: string) {
    const button = document.createElement("button");
    button.classList.add("icon-button");
    button.setAttribute("title", label); // Shows Text

    button.onclick = onClick;
    this.leftBar.appendChild(button);

    const img = document.createElement("img");
    img.src = src;
    img.classList.add("icon-img");
    button.appendChild(img);
  }

  private clear() {
    this.leftBar.textContent = "";
  }

  private addRouterButton() {
    const addRouter = () => addDevice(this.ctx, DeviceType.Router);
    this.addButton(RouterSvg, addRouter, "Add Router");
  }

  private addHostButton() {
    const addHost = () => addDevice(this.ctx, DeviceType.Host);
    this.addButton(ComputerSvg, addHost, "Add Host");
  }

  private addSwitchButton() {
    const addSwitch = () => addDevice(this.ctx, DeviceType.Switch);
    this.addButton(SwitchSvg, addSwitch, "Add Switch");
  }

  setButtonsByLayer(layerName: string) {
    this.clear();

    const layer = layerFromName(layerName);

    this.addHostButton();

    if (layer <= Layer.Network) {
      this.addRouterButton();
    }

    if (layer <= Layer.Link) {
      this.addSwitchButton();
    }
  }
}
