// Tooltip Keys
export const TOOLTIP_KEYS = {
  ID: "ID",
  CONNECTED_DEVICES: "Connected Devices",
  MAC_ADDRESS: "MacAddress",
  IP_ADDRESS: "IP Address",
  ROUTER_INFORMATION: "Router Information",
  HOST_INFORMATION: "Host Information",
  SWITCH_INFORMATION: "Switch Information",
  LAYER_SELECTOR: "layer-selector",
  APP_LAYER: "App Layer",
  TRANSPORT_LAYER: "Transport Layer",
  NETWORK_LAYER: "Network Layer",
  LINK_LAYER: "Link Layer",
  IP: "IP",
  MASK: "Mask",
  INTERFACE: "Interface",
  PROGRAM: "Program",
  SEND_ICMP_ECHO: "Send ICMP echo",
  ECHO_SERVER: "Echo server",
  DESTINATION: "Destination",
  SEND_HTTP_REQUEST: "Send HTTP request",
  TIME_BETWEEN_PINGS: "Time between pings",
  NAME: "Name",
  PID: "PID",
  INPUTS: "Inputs",
  NEW_BUTTON: "new-button",
  SAVE_BUTTON: "save-button",
  LOAD_BUTTON: "load-button",
  PRINT_BUTTON: "print-button",
  HELP_BUTTON: "help-button",
  PAUSE_BUTTON: "pause-button",
  UNDO: "undo",
  REDO: "redo",
  SPEED_WHEEL: "speed-wheel",
  ADD_HOST: "Add Host",
  ADD_ROUTER: "Add Router",
  ADD_SWITCH: "Add Switch",
  CONNECT_DEVICE: "Connect device",
  DELETE_DEVICE: "Delete device",
  START_PROGRAM: "Start program",
  ROUTING_TABLE: "Routing Table",
  ROUTER_PARAMETERS: "Router Parameters",
  SWITCH_PARAMETERS: "Switch Parameters",
  HOST_PARAMETERS: "Host Parameters",
  PACKET_QUEUE_SIZE_PARAMETER: "Packet queue size (bytes)",
  PROCESSING_SPEED_PARAMETER: "Processing speed (ms/byte)",
  REGENERATE: "Regenerate",
} as const;

// Tooltip Content
export const TOOLTIP_CONTENT = {
  [TOOLTIP_KEYS.ID]:
    "The unique identifier (ID) for this device within the network simulator. It is used internally to distinguish this device from others and is not visible to external networks.",
  [TOOLTIP_KEYS.CONNECTED_DEVICES]:
    "This field lists all devices that are directly connected to this device. These connections can represent physical links, such as cables, or logical links, such as virtual connections in a software-defined network.",
  [TOOLTIP_KEYS.MAC_ADDRESS]:
    "The MAC (Media Access Control) address is a hardware identifier assigned to a network interface card (NIC). It is used for communication within a local network and operates at the data link layer of the OSI model.",
  [TOOLTIP_KEYS.IP_ADDRESS]:
    "The IP (Internet Protocol) address is a unique identifier assigned to a device on a network. It allows devices to communicate with each other over the network. IPv4 addresses are 32-bit numbers, while IPv6 addresses are 128-bit numbers.",
  [TOOLTIP_KEYS.ROUTER_INFORMATION]:
    "A router is a networking device that forwards data packets between computer networks. It determines the best path for data to travel and connects different networks, such as a home network and the internet.",
  [TOOLTIP_KEYS.HOST_INFORMATION]:
    "A host is an end device in a network, such as a computer, server, or smartphone. Hosts are assigned IP addresses and can send and receive data over the network. They are typically the source or destination of network traffic.",
  [TOOLTIP_KEYS.SWITCH_INFORMATION]:
    "A switch is a networking device that connects devices within a local area network (LAN). It operates at the data link layer and uses MAC addresses to forward data to the correct device. Switches improve network efficiency by reducing collisions.",
  [TOOLTIP_KEYS.LAYER_SELECTOR]: "Select a Layer.",
  [TOOLTIP_KEYS.APP_LAYER]:
    "The Application Layer enables communication between network applications, defining protocols that specify how messages are formatted, transmitted, and processed. It supports different architectures, such as client-server (used in HTTP, SMTP, and DNS) and peer-to-peer (P2P). This layer powers essential services like web browsing, email, file transfers, and domain name resolution, ensuring seamless interaction between users and network services.",
  [TOOLTIP_KEYS.TRANSPORT_LAYER]:
    "The Transport Layer ensures end-to-end communication between applications on different devices. It provides essential services such as multiplexing, reliable data transfer, congestion control, and flow control. Protocols like TCP offer reliability through acknowledgments, retransmissions, and sequence numbers, while UDP provides a simpler, connectionless service with lower overhead. This layer plays a crucial role in ensuring data is transmitted efficiently and reliably across the network.",
  [TOOLTIP_KEYS.NETWORK_LAYER]:
    "The Network Layer is responsible for delivering data packets across different networks, ensuring they reach the correct destination. It determines the best paths for data transmission using routing protocols and manages addressing through IPv4 and IPv6. This layer also includes mechanisms for forwarding packets efficiently and handling network-wide configurations. Through routing algorithms like link-state and distance-vector, as well as protocols such as OSPF and BGP, the Network Layer plays a crucial role in maintaining global connectivity across the internet.",
  [TOOLTIP_KEYS.LINK_LAYER]:
    "The Link Layer is responsible for transferring data between directly connected nodes, such as hosts, switches, routers, and WiFi access points. It encapsulates network-layer packets into frames and ensures efficient transmission over different types of links. This layer also includes mechanisms for error detection and correction, multiple access control for shared networks, and link-layer addressing using MAC addresses. Technologies like Ethernet, WiFi, and VLANs operate at this level, enabling both wired and wireless communication within local networks.",
  [TOOLTIP_KEYS.ROUTING_TABLE]:
    "The routing table is a data structure used by routers to determine the best path for forwarding packets to their destination.",
  [TOOLTIP_KEYS.IP]:
    "The IP (Internet Protocol) address is a unique identifier assigned to a device on a network.",
  [TOOLTIP_KEYS.MASK]:
    "The subnet mask defines the range of IP addresses within a network.",
  [TOOLTIP_KEYS.INTERFACE]:
    "The network interface (e.g., eth0) represents the physical or virtual connection point.",
  [TOOLTIP_KEYS.PROGRAM]: "Select a program to run on the host device.",
  [TOOLTIP_KEYS.SEND_ICMP_ECHO]:
    "Send an ICMP echo request to a specified IP address. This command is used to test network connectivity and determine if a remote host is reachable.",
  [TOOLTIP_KEYS.ECHO_SERVER]:
    "An Echo server is a network service that sends back any data it receives to the sender. It is commonly used for testing and debugging network connections.",
  [TOOLTIP_KEYS.DESTINATION]:
    "Select the destination for the packet to be sent.",
  [TOOLTIP_KEYS.SEND_HTTP_REQUEST]:
    "Send an HTTP request to a specified URL. This command is used to retrieve web pages or other resources from a web server.",
  [TOOLTIP_KEYS.TIME_BETWEEN_PINGS]:
    "Specify the time interval between consecutive ping requests.",
  [TOOLTIP_KEYS.NAME]: "The name of the program or process currently running.",
  [TOOLTIP_KEYS.PID]:
    "The Process ID (PID) is a unique identifier assigned to a running program or process.",
  [TOOLTIP_KEYS.INPUTS]:
    "The input parameters or arguments provided to the program when it was started.",
  [TOOLTIP_KEYS.NEW_BUTTON]: "Clears the canvas. Shortcut: [N] key.",
  [TOOLTIP_KEYS.SAVE_BUTTON]: "Saves the current network. Shortcut: [S] key.",
  [TOOLTIP_KEYS.LOAD_BUTTON]: "Loads the current network. Shortcut: [L] key.",
  [TOOLTIP_KEYS.PRINT_BUTTON]:
    "Generates an image of the network. Shortcut: [P] key.",
  [TOOLTIP_KEYS.HELP_BUTTON]:
    "Opens the help and settings menu. Shortcut: [H] key.",
  [TOOLTIP_KEYS.PAUSE_BUTTON]:
    "Pauses the simulation. Click again to resume. Shortcut: [Space] key.",
  [TOOLTIP_KEYS.UNDO]: "Undoes the last action. Shortcut: [Ctrl + Z] key.",
  [TOOLTIP_KEYS.REDO]:
    "Redoes the last undone action. Shortcut: [Ctrl + Y] key.",
  [TOOLTIP_KEYS.SPEED_WHEEL]: "Adjusts the simulation speed.",
  [TOOLTIP_KEYS.ADD_HOST]: "Adds a host to the canvas.",
  [TOOLTIP_KEYS.ADD_ROUTER]: "Adds a router to the canvas.",
  [TOOLTIP_KEYS.ADD_SWITCH]: "Adds a switch to the canvas.",
  [TOOLTIP_KEYS.CONNECT_DEVICE]:
    "Connects the selected device to another device. Click on the target device to establish the connection. Shortcut: [C] key.",
  [TOOLTIP_KEYS.DELETE_DEVICE]:
    "Deletes the selected device from the canvas. Shortcut: [Delete] key.",
  [TOOLTIP_KEYS.START_PROGRAM]:
    "Starts the selected program on the host device. Ensure all required inputs are provided.",
  [TOOLTIP_KEYS.ROUTER_PARAMETERS]:
    "Router parameters allow you to configure the router's settings",
  [TOOLTIP_KEYS.SWITCH_PARAMETERS]:
    "Switch parameters allow you to configure the switch's settings",
  [TOOLTIP_KEYS.HOST_PARAMETERS]:
    "Host parameters allow you to configure the host's settings",
  [TOOLTIP_KEYS.PACKET_QUEUE_SIZE_PARAMETER]:
    "The maximum size of the packet queue in bytes. This parameter determines how many packets can be stored in the queue before they are processed.",
  [TOOLTIP_KEYS.PROCESSING_SPEED_PARAMETER]:
    "The time taken to process a single byte of data. This parameter affects the speed at which packets are processed and sent.",
  [TOOLTIP_KEYS.REGENERATE]: "Regenerate the routing table.",
} as const;
