// Tooltip Keys
export const TOOLTIP_KEYS = {
  ID: "ID",
  TAG: "Tag",
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
  SEND_HTTP_REQUEST: "Send HTTP request",
  SERVE_HTTP_REQUESTS: "Serve HTTP requests",
  SEND_ARP_REQUEST: "Send ARP request",
  DESTINATION: "Destination",
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
  SPEED_WHEEL: "Speed",
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
  PROCESSING_SPEED_PARAMETER: "Processing speed (bytes/s)",
  REGENERATE: "Regenerate",
  ADD_ENTRY_BUTTON: "Add entry",
  DELETE_ENTRY_BUTTON: "Delete entry",
  DELETE_EDGE_BUTTON: "Delete Edge",
  CONNECTION: "Connection",
  PACKET_TYPE: "Packet Type",
  SOURCE_MAC_ADDRESS: "Source MAC Address",
  DESTINATION_MAC_ADDRESS: "Destination MAC Address",
  SOURCE_IP_ADDRESS: "Source IP Address",
  DESTINATION_IP_ADDRESS: "Destination IP Address",
  SOURCE_PORT: "Source Port",
  DESTINATION_PORT: "Destination Port",
  DISCARD_PACKET_BUTTON: "Discard Packet",
  PACKET_QUEUE_USAGE: "Packet Queue Usage",
  EDGE_CONNECTED_DEVICES: "edge Connected Devices",
  EDGE_CONNECTED_INTERFACES: "Connected Interfaces",
  MAC_ADDRESS_IFACE: "MAC Address iface",
  PROGRAM_RUNNER: "Program Runner",
  EDGE_INFORMATION: "Edge Information",
  PACKET_INFORMATION: "Packet Information",
  IP_REQUEST: "IP to Request",
  ARP_TABLE: "ARP Table",
  IFACE_EDITOR: "iface-editor",
  PORT: "Port",
  FORWARDING_TABLE: "Forwarding Table",
  MULTI_EDGE_CONNECTED_DEVICES: "Multi Edge Connected Devices",
  ETHERTYPE: "Ether Type",
  CRC: "CRC",
  // ARP Details
  HTYPE: "Hardware Type",
  PTYPE: "Protocol Type",
  HLEN: "Hardware address Length",
  PLEN: "Protocol address Length",
  OP: "Operation code",
  SHA: "Sender Hardware Address",
  SPA: "Sender Protocol Address",
  THA: "Target Hardware Address",
  TPA: "Target Protocol Address",
  // TCP Details
  SEQ: "Seq Number",
  ACK: "Ack Number",
  WINDOW: "Window Size",
  // TCP Flags
  URG_FLAG: "Urg",
  ACK_FLAG: "Ack",
  PSH_FLAG: "Psh",
  RST_FLAG: "Rst",
  SYN_FLAG: "Syn",
  FIN_FLAG: "Fin",
  // IPV4 details
  VERSION: "Version",
  INTERNET_HEADER_LENGTH: "Internet Header Length",
  TYPE_OF_SERVICE: "Type of Service",
  TOTAL_LENGTH: "Total Length",
  IDENTIFICATION: "Identification",
  FRAGMENT_OFFSET: "Fragment Offset",
  TIME_TO_LIVE: "Time to Live",
  PROTOCOL: "Protocol",
  HEADER_CHECKSUM: "Header Checksum",
  PAYLOAD: "Payload",
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
  [TOOLTIP_KEYS.REGENERATE]: "Regenerate the table.",
  [TOOLTIP_KEYS.DELETE_ENTRY_BUTTON]:
    "Delete the selected entry from the table.",
  [TOOLTIP_KEYS.ADD_ENTRY_BUTTON]: "Add a new entry to the table.",
  [TOOLTIP_KEYS.DELETE_EDGE_BUTTON]:
    "Delete the selected edge. This action will remove the connection between two devices.",
  [TOOLTIP_KEYS.CONNECTION]:
    "The connection between two devices. This field shows the IDs of the connected devices.",
  [TOOLTIP_KEYS.PACKET_TYPE]:
    "The type of packet being processed. This field indicates the protocol used in the packet, such as TCP, UDP, or ICMP.",
  [TOOLTIP_KEYS.SOURCE_MAC_ADDRESS]:
    "The MAC address of the device that sent the packet. This address is used to identify the source device in the network.",
  [TOOLTIP_KEYS.DESTINATION_MAC_ADDRESS]:
    "The MAC address of the device that is the intended recipient of the packet. This address is used to identify the destination device in the network.",
  [TOOLTIP_KEYS.SOURCE_IP_ADDRESS]:
    "The IP address of the device that sent the packet. This address is used to identify the source device in the network.",
  [TOOLTIP_KEYS.DESTINATION_IP_ADDRESS]:
    "The IP address of the device that is the intended recipient of the packet. This address is used to identify the destination device in the network.",
  [TOOLTIP_KEYS.SOURCE_PORT]:
    "The source port number used by the sending device. This number is used to identify the specific application or service on the source device.",
  [TOOLTIP_KEYS.DESTINATION_PORT]:
    "The destination port number used by the receiving device. This number is used to identify the specific application or service on the destination device.",
  [TOOLTIP_KEYS.DISCARD_PACKET_BUTTON]:
    "Discard the selected packet. This action will remove the packet from the network simulation without processing it.",
  [TOOLTIP_KEYS.PACKET_QUEUE_USAGE]:
    "The progress bar visually represents the percentage of the queue currently occupied by packets waiting to be processed",
  [TOOLTIP_KEYS.EDGE_CONNECTED_DEVICES]:
    "This field shows the two devices directly connected by this edge.",
  [TOOLTIP_KEYS.EDGE_CONNECTED_INTERFACES]:
    "This field shows the two interfaces directly connected by this edge.",
  [TOOLTIP_KEYS.MAC_ADDRESS_IFACE]:
    "The MAC address of the interface. This address is used to identify the interface in the network.",
  [TOOLTIP_KEYS.PROGRAM_RUNNER]:
    "Here you can execute different programs on the host devices.",
  [TOOLTIP_KEYS.EDGE_INFORMATION]:
    "An edge represents a connection between two devices in the network. It provides information about the devices and interfaces directly connected by this link. Edges can represent physical connections, such as cables, or logical connections in a virtualized environment.",
  [TOOLTIP_KEYS.PACKET_INFORMATION]:
    "A packet is a unit of data transmitted across the network. This field provides detailed information about the packet, including its source, destination, and the protocol used for communication.",
  [TOOLTIP_KEYS.ARP_TABLE]:
    "The ARP (Address Resolution Protocol) table maps IP addresses to MAC addresses. It is used to resolve the hardware address of a device in the same local network.",
  [TOOLTIP_KEYS.IFACE_EDITOR]:
    "Modify the network interface used by this device.",
  [TOOLTIP_KEYS.PORT]:
    "The port in the forwarding table refers to the physical or logical interface on the switch where a device is connected. It is used to forward frames to the correct destination based on the MAC address. This should not be confused with the 'port' used in transport layer protocols (such as TCP/UDP port numbers), which identify specific applications or services.",
  [TOOLTIP_KEYS.FORWARDING_TABLE]:
    "The forwarding table is a data structure used by switches to map MAC addresses to specific interface. It helps the switch determine where to forward incoming frames based on their destination MAC address.",
  [TOOLTIP_KEYS.MULTI_EDGE_CONNECTED_DEVICES]:
    "This field shows the devices connected to the selected edge. It provides a list of all devices that are directly connected.",
  [TOOLTIP_KEYS.SEND_ARP_REQUEST]:
    "Send an ARP request to a specified IP address. This command is used to resolve the MAC address of a device in the same local network.",
  [TOOLTIP_KEYS.SERVE_HTTP_REQUESTS]:
    "Serve HTTP requests to clients. This command is used to respond to incoming HTTP requests with the appropriate data.",
  [TOOLTIP_KEYS.HTYPE]:
    "Hardware type. Specifies the type of hardware used for the network (e.g., 1 for Ethernet).",
  [TOOLTIP_KEYS.PTYPE]:
    "Protocol type. Specifies the protocol address type (e.g., 0x0800 for IPv4).",
  [TOOLTIP_KEYS.HLEN]:
    "Hardware address length. Indicates the length in bytes of a hardware address (e.g., 6 for MAC).",
  [TOOLTIP_KEYS.PLEN]:
    "Protocol address length. Indicates the length in bytes of a protocol address (e.g., 4 for IPv4).",
  [TOOLTIP_KEYS.OP]:
    "Operation code. Specifies the ARP operation: 1 for request, 2 for reply.",
  [TOOLTIP_KEYS.SHA]:
    "Sender hardware address (MAC). The MAC address of the sender.",
  [TOOLTIP_KEYS.SPA]:
    "Sender protocol address (IP). The IP address of the sender.",
  [TOOLTIP_KEYS.THA]:
    "Target hardware address (MAC). The MAC address of the target.",
  [TOOLTIP_KEYS.TPA]:
    "Target protocol address (IP). The IP address of the target.",
  [TOOLTIP_KEYS.ETHERTYPE]:
    "Ether Type field. Specifies the protocol encapsulated in the payload of the frame.",
  [TOOLTIP_KEYS.CRC]:
    "Cyclic Redundancy Check (CRC). A checksum used for error-checking the frame. It helps detect errors in the transmitted data.",
  [TOOLTIP_KEYS.SEQ]:
    "Sequence number. Used to identify the order of packets in a TCP stream.",
  [TOOLTIP_KEYS.ACK]:
    "Acknowledgment number. Used to confirm the receipt of packets in a TCP stream.",
  [TOOLTIP_KEYS.WINDOW]:
    "Window size. Indicates the amount of data that can be sent before receiving an acknowledgment.",
  [TOOLTIP_KEYS.URG_FLAG]:
    "Urgent flag. Indicates that the packet contains urgent data.",
  [TOOLTIP_KEYS.ACK_FLAG]:
    "Acknowledgment flag. Indicates that the acknowledgment number is valid.",
  [TOOLTIP_KEYS.PSH_FLAG]:
    "Push flag. Indicates that the receiver should pass the data to the application immediately.",
  [TOOLTIP_KEYS.RST_FLAG]:
    "Reset flag. Indicates that the connection should be reset.",
  [TOOLTIP_KEYS.SYN_FLAG]:
    "Synchronize flag. Used to initiate a TCP connection.",
  [TOOLTIP_KEYS.FIN_FLAG]:
    "Finish flag. Indicates that the sender has finished sending data and wants to close the connection.",
  [TOOLTIP_KEYS.VERSION]:
    "The version of the IP protocol. For IPv4, this value is always 4.",
  [TOOLTIP_KEYS.INTERNET_HEADER_LENGTH]:
    "The length of the IP header in 32-bit words. The minimum value is 5 (20 bytes), indicating no options are present.",
  [TOOLTIP_KEYS.TYPE_OF_SERVICE]:
    "Specifies the quality of service desired for this packet, such as precedence, delay, throughput, and reliability.",
  [TOOLTIP_KEYS.TOTAL_LENGTH]:
    "The total length of the IP packet, including both header and data, in bytes.",
  [TOOLTIP_KEYS.IDENTIFICATION]:
    "An identifying value assigned by the sender to aid in assembling the fragments of a datagram.",
  [TOOLTIP_KEYS.FRAGMENT_OFFSET]:
    "Indicates where in the datagram this fragment belongs. Used for reassembling fragmented packets.",
  [TOOLTIP_KEYS.TIME_TO_LIVE]:
    "The maximum number of hops (routers) the packet can pass through before being discarded. Prevents infinite loops.",
  [TOOLTIP_KEYS.PROTOCOL]:
    "Indicates the protocol used in the data portion of the IP datagram (e.g., TCP, UDP, ICMP).",
  [TOOLTIP_KEYS.HEADER_CHECKSUM]:
    "A checksum on the header only, used for error-checking of the header.",
  [TOOLTIP_KEYS.PAYLOAD]:
    "The encapsulated data carried by the IP packet. This could be a TCP segment, UDP datagram, or other protocol data.",
  [TOOLTIP_KEYS.TAG]:
    "The tag is a label or identifier assigned to a device or network element.",
} as const;
