export const tooltipsDictionary: Record<string, string> = {
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
  IP: "The IP (Internet Protocol) address is a unique identifier assigned to a device on a network.",
  Mask: "The subnet mask defines the range of IP addresses within a network.",
  Interface:
    "The network interface (e.g., eth0) represents the physical or virtual connection point.",
  PID: "The Process ID (PID) is a unique identifier assigned to a running program or process.",
  Name: "The name of the program or process currently running.",
  Inputs:
    "The input parameters or arguments provided to the program when it was started.",
  layerselect:
    "Select a network layer to view and interact with its elements. Options include:\n" +
    "- App Layer: Provides network services directly to user applications.\n" +
    "- Transport Layer: Ensures reliable data transfer between devices.\n" +
    "- Network Layer: Handles routing of data between devices across networks.\n" +
    "- Link Layer: Manages physical transmission of data between devices.",
};

/**
 * Attach a tooltip to an HTML element.
 * @param element The HTML element to attach the tooltip to.
 * @param key The key to look up the tooltip text in the dictionary.
 */
export function attachTooltip(element: HTMLElement, key: string) {
  if (key in tooltipsDictionary) {
    console.log(`Attaching tooltip to ${key} en attacherTooltip`);
    element.classList.add("has-tooltip");
    element.addEventListener("mouseenter", () => showTooltip(key));
    element.addEventListener("mouseleave", () => hideTooltip());
  }
}

export function showTooltip(key: string) {
  const text = tooltipsDictionary[key];
  const tooltip = document.getElementById("global-tooltip");
  if (tooltip) {
    tooltip.textContent = text;
    tooltip.style.display = "block";
  }
}

export function hideTooltip() {
  const tooltip = document.getElementById("global-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}
