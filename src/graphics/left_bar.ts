import RouterSvg from "../assets/router.svg";
import ComputerSvg from "../assets/pc.svg";
import { addDevice } from "../types/viewportManager";
import { GlobalContext } from "../context";
import { DeviceType } from "../types/devices/device";

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

  clear() {
    this.leftBar.textContent = "";
  }

  addRouterButton() {
    const addRouter = () => addDevice(this.ctx, DeviceType.Router);
    this.addButton(RouterSvg, addRouter, "Add Router");
  }

  addHostButton() {
    const addHost = () => addDevice(this.ctx, DeviceType.Host);
    this.addButton(ComputerSvg, addHost, "Add Host");
  }
}
