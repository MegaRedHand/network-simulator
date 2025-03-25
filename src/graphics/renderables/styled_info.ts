import { Renderable } from "../right_bar";

const tooltipsDictionary: Record<string, string> = {
  "IP Address":
    "The IP (Internet Protocol) address is a unique identifier assigned to a device on a network. It allows devices to communicate with each other over the network. IPv4 addresses are 32-bit numbers, while IPv6 addresses are 128-bit numbers.",
  "Connected Devices":
    "This field lists all devices that are directly connected to this device. These connections can represent physical links, such as cables, or logical links, such as virtual connections in a software-defined network.",
  MacAddress:
    "The MAC (Media Access Control) address is a hardware identifier assigned to a network interface card (NIC). It is used for communication within a local network and operates at the data link layer of the OSI model.",
  ID: "The unique identifier (ID) for this device within the network simulator. It is used internally to distinguish this device from others and is not visible to external networks.",
  "Router Information":
    "A router is a networking device that forwards data packets between computer networks. It determines the best path for data to travel and connects different networks, such as a home network and the internet.",
  "Host Information":
    "A host is an end device in a network, such as a computer, server, or smartphone. Hosts are assigned IP addresses and can send and receive data over the network. They are typically the source or destination of network traffic.",
  "Switch Information":
    "A switch is a networking device that connects devices within a local area network (LAN). It operates at the data link layer and uses MAC addresses to forward data to the correct device. Switches improve network efficiency by reducing collisions.",
};

export interface Field {
  label: string;
  value: string;
  tooltip?: string;
}

export class StyledInfo implements Renderable {
  title: string;
  titleTooltip?: string;
  info: Field[] = [];

  constructor(title: string) {
    this.title = title;
    this.titleTooltip = tooltipsDictionary[title] || "";
  }

  // Clears previous calls to addX methods
  clear() {
    this.info = [];
    return this;
  }

  // Adds a new field to show on the info list
  addField(label: string, value: string, tooltip?: string) {
    const resolvedTooltip = tooltip || tooltipsDictionary[label] || "";
    this.info.push({ label, value, tooltip: resolvedTooltip });
  }

  // Adds a new field to show on the info list, which has a list of values
  addListField(label: string, values: number[], tooltip?: string) {
    const value = values.length !== 0 ? "[" + values.join(", ") + "]" : "None";
    const resolvedTooltip = tooltip || tooltipsDictionary[label] || "";
    this.info.push({ label, value, tooltip: resolvedTooltip });
  }

  // Returns a list of HTML nodes with the info to show
  toHTML() {
    const childNodes: Node[] = [];
    const header = document.createElement("h3");
    header.textContent = this.title;
    if (this.titleTooltip) {
      header.title = this.titleTooltip;
    }
    childNodes.push(header);

    this.info.forEach((item) => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;

      // Agregar tooltip si está definido
      if (item.tooltip) {
        p.title = item.tooltip;
      }

      childNodes.push(p);
    });
    return childNodes;
  }
}
