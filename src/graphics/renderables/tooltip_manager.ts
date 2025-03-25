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
};

// Función para mostrar el tooltip
export function showTooltip(text: string) {
  const tooltip = document.getElementById("global-tooltip");
  if (tooltip) {
    tooltip.textContent = text;
    tooltip.style.display = "block";
  }
}

// Función para ocultar el tooltip
export function hideTooltip() {
  const tooltip = document.getElementById("global-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}
