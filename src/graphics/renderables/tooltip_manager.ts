import { GlobalContext } from "../../context";

export class TooltipManager {
  private static instance: TooltipManager | null = null; // Singleton instance
  private tooltipsDictionary: Record<string, string>;
  private globalContext: GlobalContext | null = null; // GlobalContext puede ser opcional
  private tooltipTimeout: NodeJS.Timeout | null = null;

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
      "App Layer":
        "The Application Layer enables communication between network applications, defining protocols that specify how messages are formatted, transmitted, and processed. It supports different architectures, such as client-server (used in HTTP, SMTP, and DNS) and peer-to-peer (P2P). This layer powers essential services like web browsing, email, file transfers, and domain name resolution, ensuring seamless interaction between users and network services.",
      "Transport Layer":
        "The Transport Layer ensures end-to-end communication between applications on different devices. It provides essential services such as multiplexing, reliable data transfer, congestion control, and flow control. Protocols like TCP offer reliability through acknowledgments, retransmissions, and sequence numbers, while UDP provides a simpler, connectionless service with lower overhead. This layer plays a crucial role in ensuring data is transmitted efficiently and reliably across the network.",
      "Network Layer":
        "The Network Layer is responsible for delivering data packets across different networks, ensuring they reach the correct destination. It determines the best paths for data transmission using routing protocols and manages addressing through IPv4 and IPv6. This layer also includes mechanisms for forwarding packets efficiently and handling network-wide configurations. Through routing algorithms like link-state and distance-vector, as well as protocols such as OSPF and BGP, the Network Layer plays a crucial role in maintaining global connectivity across the internet.",
      "Link Layer":
        "The Link Layer is responsible for transferring data between directly connected nodes, such as hosts, switches, routers, and WiFi access points. It encapsulates network-layer packets into frames and ensures efficient transmission over different types of links. This layer also includes mechanisms for error detection and correction, multiple access control for shared networks, and link-layer addressing using MAC addresses. Technologies like Ethernet, WiFi, and VLANs operate at this level, enabling both wired and wireless communication within local networks.",

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
        element.addEventListener("mouseleave", () => {
          this.startHideTooltipDelay();
        });
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

      if (this.tooltipTimeout) {
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = null;
      }

      tooltip.addEventListener("mouseenter", () => {
        if (this.tooltipTimeout) {
          clearTimeout(this.tooltipTimeout);
          this.tooltipTimeout = null;
        }
      });

      tooltip.addEventListener("mouseleave", () => {
        this.startHideTooltipDelay();
      });
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

  private startHideTooltipDelay() {
    this.tooltipTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 300); // 300ms
  }
}
