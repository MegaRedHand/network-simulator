import { GlobalContext } from "../../context";

export class TooltipManager {
  private static instance: TooltipManager | null = null; // Singleton instance
  private tooltipsDictionary: Record<string, string>;
  private globalContext: GlobalContext | null = null; // GlobalContext puede ser opcional

  private constructor() {
    this.tooltipsDictionary = {
      // General Information
      ID: "The unique identifier (ID) for this device within the network simulator. It is used internally to distinguish this device from others and is not visible to external networks.",
      "Connected Devices":
        "This field lists all devices that are directly connected to this device. These connections can represent physical links, such as cables, or logical links, such as virtual connections in a software-defined network.",
      MacAddress:
        "The MAC (Media Access Control) address is a hardware identifier assigned to a network interface card (NIC). It is used for communication within a local network and operates at the data link layer of the OSI model.",
      "IP Address":
        "The IP (Internet Protocol) address is a unique identifier assigned to a device on a network. It allows devices to communicate with each other over the network. IPv4 addresses are 32-bit numbers, while IPv6 addresses are 128-bit numbers.",

      // Device Information
      "Router Information":
        "A router is a networking device that forwards data packets between computer networks. It determines the best path for data to travel and connects different networks, such as a home network and the internet.",
      "Host Information":
        "A host is an end device in a network, such as a computer, server, or smartphone. Hosts are assigned IP addresses and can send and receive data over the network. They are typically the source or destination of network traffic.",
      "Switch Information":
        "A switch is a networking device that connects devices within a local area network (LAN). It operates at the data link layer and uses MAC addresses to forward data to the correct device. Switches improve network efficiency by reducing collisions.",

      // Layer Information
      "Application Layer":
        "The topmost layer in the OSI model, responsible for providing network services directly to user applications, such as email, file transfer, and web browsing.",
      "Transport Layer":
        "Ensures reliable data transfer between devices by managing error detection, data flow control, and retransmission of lost packets. Examples include TCP and UDP protocols.",
      "Network Layer":
        "Handles the routing and forwarding of data packets between devices across different networks. It determines the best path for data to travel. Examples include IP and ICMP protocols.",
      "Link Layer":
        "The layer responsible for managing the physical transmission of data between devices on the same network. It includes error detection and MAC addressing. Examples include Ethernet and Wi-Fi.",

      // Routing Table Information
      IP: "The IP (Internet Protocol) address is a unique identifier assigned to a device on a network.",
      Mask: "The subnet mask defines the range of IP addresses within a network.",
      Interface:
        "The network interface (e.g., eth0) represents the physical or virtual connection point.",

      // Program Information
      Program: "Select a program to run on the host device.",
      "Send ICMP echo":
        "Send an ICMP echo request to a specified IP address. This command is used to test network connectivity and determine if a remote host is reachable.",
      "Echo server":
        "An Echo server is a network service that sends back any data it receives to the sender. It is commonly used for testing and debugging network connections.",
      Destination: "Select the destination for the packet to be sent.",
      "Time between pings":
        "Specify the time interval between consecutive ping requests.",
      Name: "The name of the program or process currently running.",
      PID: "The Process ID (PID) is a unique identifier assigned to a running program or process.",
      Inputs:
        "The input parameters or arguments provided to the program when it was started.",
    };
  }

  public static getInstance(): TooltipManager {
    if (!TooltipManager.instance) {
      TooltipManager.instance = new TooltipManager();
    }
    return TooltipManager.instance;
  }

  public setGlobalContext(globalContext: GlobalContext) {
    this.globalContext = globalContext;
  }

  public attachTooltip(element: HTMLElement, key: string) {
    const tooltipsEnabled = this.globalContext?.get_enable_tooltips() ?? true;

    if (key in this.tooltipsDictionary) {
      if (tooltipsEnabled) {
        element.classList.add("has-tooltip");
        element.addEventListener("mouseenter", () => this.showTooltip(key));
        element.addEventListener("mouseleave", () => this.hideTooltip());
      } else {
        element.classList.remove("has-tooltip");
      }
    }
  }

  private showTooltip(key: string) {
    const tooltipsEnabled = this.globalContext?.get_enable_tooltips() ?? true; // if no GlobalContext, assume tooltips are enabled
    if (!tooltipsEnabled) return;

    const text = this.tooltipsDictionary[key];
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.textContent = text;
      tooltip.style.display = "block";
    }
  }

  private hideTooltip() {
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.style.display = "none";
    }
  }

  public updateTooltipsState() {
    const tooltipsEnabled = this.globalContext?.get_enable_tooltips() ?? true;

    // Select all elements with the "has-tooltip" class
    const tooltipElements = document.querySelectorAll(".has-tooltip");

    tooltipElements.forEach((element) => {
      const htmlElement = element as HTMLElement;

      if (tooltipsEnabled) {
        htmlElement.classList.add("has-tooltip");
      } else {
        htmlElement.classList.remove("has-tooltip");
      }
    });
  }
}
