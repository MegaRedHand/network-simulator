# GEduNet 🌐

_GEduNet_ is an Graphical Educational Computer Network Simulator.
It's meant as an aid to students trying to understand computer networks, along with their teachers.

The project runs on the browser and is hosted in GitHub Pages.
You can access it [here](https://megaredhand.github.io/network-simulator/).

# **GEduNet - User Manual** 📘

![Preview of the simulator. Shows multiple hosts, routers and switches. Some network packets are being sent through the network.](./img/00_full-preview.png)

- [GEduNet 🌐](#gedunet-)
- [**GEduNet - User Manual** 📘](#gedunet---user-manual-)
  - [Getting Started](#getting-started)
    - [Left Bar](#left-bar)
    - [Right Bar](#right-bar)
    - [Top Bar](#top-bar)
    - [Canvas](#canvas)
  - [Devices and Edges](#devices-and-edges)
    - [Host](#host)
      - [Host Information](#host-information)
      - [Host Hover](#host-hover)
    - [Router](#router)
      - [Router Information](#router-information)
      - [Router Hover](#router-hover)
    - [Switch](#switch)
      - [Switch Information](#switch-information)
      - [Switch Hover](#switch-hover)
    - [Edge](#edge)
      - [Edge Information](#edge-information)
      - [Edge Hover](#edge-hover)
      - [Devices Interfaces](#devices-interfaces)
  - [Programs](#programs)
    - [ICMP echo](#icmp-echo)
      - [Tutorial](#tutorial)
    - [Echo Server](#echo-server)
      - [Tutorial](#tutorial-1)
    - [Send and Serve HTTP Requests](#send-and-serve-http-requests)
    - [ARP Request](#arp-request)
  - [Packets](#packets)
    - [HTTP Packet](#http-packet)
    - [TCP Packet](#tcp-packet)
    - [ICMP-8 Packet](#icmp-8-packet)
      - [Visibility](#visibility)
    - [ICMP-0 Packet](#icmp-0-packet)
      - [Visibility](#visibility-1)
    - [ARP Packet](#arp-packet)
  - [Tables](#tables)
    - [Routing Table](#routing-table)
    - [Switch Table](#switch-table)
    - [ARP Table](#arp-table)
  - [Misc](#misc)
    - [Settings](#settings)
    - [Loading and Saving](#loading-and-saving)
    - [Print Canvas](#print-canvas)
    - [Keyboard Shortcuts](#keyboard-shortcuts)
- [Development](#development)

## Getting Started

Welcome to the GEduNet simulator! This application is designed to help you visualize and understand computer networks.

GEduNet consists of 4 main components on screen:

1. Right bar: Shows information about the selected device.
2. Left bar: Contains buttons to add devices to the network.
3. Canvas: The main area where the network is displayed.
4. Top bar: Contains the simulation file controls, help and settings.

![Components of the App](./img/01_Start_Colores.jpg)

### Left Bar

The left bar contains buttons to add devices to the network. You can add the following devices:

- **Host**: A computer or device that connects to the network.
- **Router**: A device that forwards data packets between computer networks.
- **Switch**: A device that connects devices within a single network and uses MAC addresses to forward data to the correct destination.

In order to add a device, just click on the corresponding button and the selected device will appear in the center of the canvas.

<p align="center">
  <img src="./img/02_Add_device.gif" alt="Adding a Device" />
</p>

Depending on the selected layer, different devices will be added to the leftbar. This is to properly distinguish which devices
are involved on the different layers.
The device distribution is as follows:

- **App Layer**: Host
- **Transport Layer**: Host
- **Network Layer**: Host and Router
- **Link Layer**: Host, Router and Switch

### Right Bar

The right bar shows information about the selected device. This information varies depending on the type of device selected and
the chosen layer. This section also shows data of the network edges and packets.

To see the information of a device, edge or packet, just click on it and the right bar will update to show the information of the selected device.

<p align="center">
  <img src="./img/03_Select_Device.gif" alt="Selecting Device" />
</p>

### Top Bar

This section contains the simulation file controls. This includes the following buttons:

- **New**: Reset the current network to its initial state.
- **Save**: Save the current network to a JSON file.
- **Load**: Load a network from a JSON file of your own.
- **Print**: Take a snapshot of the current network and save it as a .png image.

On the right side of the top bar, you can find the help button. This button will open a modal with a list of different shortcuts
and some configuration options.

<p align="center">
  <img src="./img/04_Top_Bar_Overview.gif" alt="Top Bar Overview" />
</p>

### Canvas

This is the main area where the network is displayed. You can drag devices to move them around the canvas and zoom in and out using the mouse wheel.

There are also some controls of the packet simulation, which are located on the top of the canvas. These controls are:

- **Play/Pause**: Start or stop the packet flow on the network.
- **Undo/Redo**: Undo or redo the last action in case you made a mistake.
- **Packet Speed Wheel**: Change the speed of the packets on the network. This is a slider that sets a multiplier to the speed of the packets. The default value is 1, which means that the packets will be sent at normal speed. You can set it up to 0.5 to slow down the packets or up to 4 to speed them up.
- **Layer Dropdown**: Change the layer of the network. When selecting a new layer, the network and the simulator functionalities will change as well. Setting a new layer may change:

  - The devices that can be added to the network.
  - The information shown in the right bar.
  - The packets shown in the network.
  - The devices visible in the network.

  This creates a focused view that will help you understand each networking layer independently.

The available layers are:

- App Layer
- Transport Layer
- Network Layer
- Link Layer

<p align="center">
  <img src="./img/05_Canvas_Overview.gif" alt="Canvas Overview" />
</p>

<p align="center">
  <img src="./img/06_Canvas_Buttons.gif" alt="Canvas Overview" />
</p>

This introductory information is also shown on the right bar when nothing is selected.

## Devices and Edges

### Host

<p align="center">
  <img src="./src/assets/pc.svg" alt="Host" width="25%" style="background-color: white;border-radius: 10px;" />
</p>

A host is a computer or device that connects to the network. It can send and receive data packets. In the simulator, a host can be used to represent a computer, a server or any other endpoint that connects to the network.

In the simulator, a host is visible on all layers. Given the fact that hosts are endpoints, they can't be abstacted to a specific layer. Hosts are involved on every layer.

#### Host Information

<p align="center">
  <img src="./img/08_Host_Right_Bar.png" alt="Host Right Bar" />
</p>

The information shown in the right bar when selecting a host is as follows:

- **ID**: The ID of the host. This is a simulated unique identifier for the host in the network.
- **Connected Devices**: The devices that are directly connected to this host through edges.
- **MAC Address**: The MAC address of the host. This is only visible in the Link Layer.
- **IP Address**: The IP address of the host. This is always visible.
- **Connect Device Button**: This button allows you to connect the host to another device. First press the Connect Device button and then click on the device you want to connect to. This will create an edge between the two devices. You can only connect
  devices if the host and the other device have free interfaces.
  When you connect a host to another device, it will link the first two unused interfaces of each device. You can change the interfaces used to connect the devices by selecting the [edge](#devices-interfaces) that connects them.
- **Delete Device Button**: This button allows you to delete the host from the network. This will also delete all edges connected to this host.
- **Program Runner Section**: This section includes a dropdown to select a program and a second button to start the program after
  selecting the program inputs.
- **ARP Table**: This table shows the translation of the different IP Adresses translations into MAC Adresses. It also allows to edit and refresh these translations.

#### Host Hover

Hovering on a Host will show the IP address. If the simulator is set on the Link Layer, it will also show the MAC address.

<p align="center">
  <img src="./img/07_Host_Info.gif" alt="Host Info" />
</p>

### Router

<p align="center">
  <img src="./src/assets/router.svg" alt="Router" width="25%" style="background-color: white;border-radius: 10px;" />
</p>

A router is a device that forwards data packets between computer networks. It is used to connect different networks and route data between them.

In the simulator, the routers are visible from the Network layer downward. Routers act as intermediaries between different networks and are responsible for routing data packets to their destination. But they are not particularly involved in the App and Transport layers.

#### Router Information

<p align="center">
  <img src="./img/09_Router_Right_Bar.png" alt="Router Right Bar" />
</p>

The information shown in the right bar when selecting a router is as follows:

- **ID**: The ID of the router. This is a simulated unique identifier for the router in the network.
- **Connected Devices**: The devices that are directly connected to this router through edges.
- **MAC Address**: The MAC address of the router. This is only visible in the Link Layer.
- **IP Address**: The IP address of the router. This is always visible.
- **Connect Device Button**: This button allows you to connect the router to another device. First press the Connect Device button and then click on the device you want to connect to. This will create an edge between the two devices. You can only connect
  devices if the host and the other device have free interfaces.
  When you connect a router to another device, it will link the first two unused interfaces of each device. You can change the interfaces used to connect the devices by selecting the [edge](#devices-interfaces) that connects them.
- **Delete Device Button**: This button allows you to delete the router from the network. This will also delete all edges connected to this router.
- **Packet Queue Usage Bar**: This bar shows the usage of the packet queue of the router. The packet queue is used to store packets that are waiting to be processed by the router. The bar shows the percentage of the queue that is currently in use. If the queue is full, the router will drop packets until there is space in the queue.
- **Router Parameters Dropdown**: This dropdown allows you to select the parameters of the router. The parameters are:
  - **Packet Queue Size [bytes]**: The amount of bytes that the router can store in its queue. This is the maximum size of the queue. The default value is 1024 bytes.
  - **Packet Processing Speed [ms/byte]**: The time it takes for the router to process a packet. The default value is 8 miliseconds.
- **Routing Table**: The routing table is a data structure used by routers to determine the best path for forwarding packets to their destination. It contains the IP, the Nework Mask and the selected interface. You can edit the entries of the table to fit your desired routing scheme. You can also restore the default state of the table by pressing the reset button on the top right corner.
- **ARP Table**: This table shows the translation of the different IP Adresses translations into MAC Adresses. It also allows to edit and refresh these translations.

#### Router Hover

Hovering on a Router will show the IP address. If the simulator is set on the Link Layer, it will also show the MAC address.

<p align="center">
  <img src="./img/10_Router_Overview.gif" alt="Router Overview" />
</p>

### Switch

<p align="center">
  <img src="./src/assets/switch.svg" alt="Switch" width="25%" style="background-color: white;border-radius: 10px;" />
</p>

A switch is a device that connects devices within a single network and uses MAC addresses to forward data to the correct destination. It is used to connect devices on a local area network (LAN) and is responsible for forwarding data packets between those devices.

In the simulator, the switches are only in the Link Layer. As switches are used to connect devices within a single network, they are not involved in the use of endpoints or routing data between different networks.

> ⚠️ Aclaración de la simplificación de LANs en el simulador

#### Switch Information

<p align="center">
  <img src="./img/11_Switch_Data.png" alt="Switch Info" />
</p>

The information shown in the right bar when selecting a switch is as follows:

- **ID**: The ID of the switch. This is a simulated unique identifier for the switch in the network.
- **Connected Devices**: The devices that are directly connected to this switch through edges.
- **MAC Address**: The MAC address of the switch.
- **Connect Device Button**: This button allows you to connect the switch to another device. First press the Connect Device button and then click on the device you want to connect to. This will create an edge between the two devices. You can only connect
  devices if the host and the other device have free interfaces.
  When you connect a switch to another device, it will link the first two unused interfaces of each device. You can change the interfaces used to connect the devices by selecting the [edge](#devices-interfaces) that connects them.
- **Delete Device Button**: This button allows you to delete the switch from the network. This will also delete all edges connected to this switch.
- **Switching Table**: This table shows the MAC Address and the port in which that Address is assigned.
  This table is used by the switch to forward data packets to the correct destination. You can edit the entries of the table to fit your desired switching scheme. You can also restore the default state of the table by pressing the reset button on the top right corner.

#### Switch Hover

Hovering on a Switch will show the MAC address.

<p align="center">
  <img src="./img/12_Switch_Overview.gif" alt="Switch Overview" />
</p>

### Edge

In the simulator, and edge represents a connection between two devices. Packets travel through edges to reach their destination.
If a device stops being visible while changing layers, the respective edges will also stop being visible.

<p align="center">
  <img src="./img/13_Edge_remove_1.gif" alt="Edge Disappear" />
</p>

However, if the device that stops being visible in one layer is in the middle of two visible devices, the edges will still be visible and the device will be replaced with a **dot**. This **dot** will not be selectable and will not show any information when hovered. It is just a placeholder to show that there is a connection between the two devices. Besides, it lets you manipulate the network more easily.

<p align="center">
  <img src="./img/14_Edge_and_dot.gif" alt="Edge and Dot" />
</p>

#### Edge Information

<p align="center">
  <img src="./img/15_Edge_info.png" alt="Edge Info" />
</p>

The information shown in the right bar when selecting an edge that conects two devices is as follows:

- **Connected Devices**: The IDs of the devices that are connected by this edge.
- **Connected Interfaces**: The interfaces that are used to connect the two devices.
- **MAC Address Interface of Device 1**: The MAC address of the interface of the first device.
- **MAC Address Interface of Device 2**: The MAC address of the interface of the second device.
- **Delete Edge Button**: This button allows you to delete the edge from the network.
- **Device 1 Interface Dropdown**: This dropdown allows you to select the interface that the first device will use to connect to the second device.
- **Device 2 Interface Dropdown**: This dropdown allows you to select the interface that the second device will use to connect to the first device.

If there is a dot in the middle of the edge, it would not be clear which device is the first and which is the second. In this case, the whole path will be selected and it will show the devices connected by that path. If you want to see more information about one of those specific edges, you will have to change the current layer.

<p align="center">
  <img src="./img/16_Multiple_Edges.gif" alt="Multiple Edges" />
</p>

#### Edge Hover

While hovering over an edge, it will show the interfaces that each device use to communicate with each other. This way you can
see how the devices are connected.

#### Devices Interfaces

When you select an edge that connect two devices, you will see a dropdown menu to select which interface of each device you want to use to connect those devices. Each type of device has a fixed limited amount of interfaces. Hosts have 2 interfaces, Routers have 4 and Switches have 8.

<p align="center">
  <img src="./img/17_Host_Interfaces.png" alt="Host Interfaces" />
  <img src="./img/18_Router_Interfaces.png" alt="Router Interfaces" />
  <img src="./img/19_Switch_Interfaces.png" alt="Switch Interfaces" />
</p>

## Programs

One of the features of the simulator is the ability to run programs on the devices. These programs are used to simulate different network protocols and applications. The programs are available in the right bar when selecting a host.

### ICMP echo

An ICMP echo is a network utility used to test the reachability of a host on an IP network. It sends an ICMP echo request packet to the target host and waits for an ICMP echo reply. This is commonly used to check if a host is reachable and to measure the round-trip time for packets sent from the source to the destination.

In the simulator, the ICMP echo program is used to send an ICMP echo request packet to a device and wait for an ICMP echo reply.

#### Tutorial

1. select "Send ICMP echo" program from the dropdown menu.
2. Select the destination device (Router or Host) to send the packet to.
3. Press the "Start Program" button to send the packet.

The packet will travel through the network following the current routing scheme. If it reaches the destination device, it will send an ICMP echo reply back to the source device. If not, the packet will be dropped.

<p align="center">
  <img src="./img/20_Echo_Program.gif" alt="Echo Program" />
</p>

### Echo Server

An echo server is a network service that receives data from a client and sends it back to the client. Just as the echo program, it is commonly used to test network connectivity and to measure the round-trip time for packets sent from the client to the server and back.

In the simulator, the echo server program works similar to the ICMP echo program but it sends multiple ICMP echo request packets to a destination device. The destination device will then send an ICMP echo reply back to the source device for each packet received.

#### Tutorial

1. Select the "Echo Server" program from the dropdown menu.
2. Select the destination device (Router or Host) to send the packets to.
3. Choose the time between pings that the packets will have. The shorter the time, the more packets will be sent. The selectable values are 250ms, 500ms, 1s, 5s and 15s.
4. Press the "Start Program" button to start the server.

The packets will travel through the network following the current routing scheme and the selected time between pings. If they reach the destination device, it will send an ICMP echo reply back to the source device. If not, the packet will be dropped.

If you want to stop the program, you can press the Trash can icon on the program table of the host.

<p align="center">
  <img src="./img/21_Echo_Server_Program.gif" alt="Echo Server Program" />
</p>

### Send and Serve HTTP Requests

### ARP Request

## Packets

Packets are the data units that travel through the network. They are used to send and receive data between devices. In the simulator, packets are represented as colored circles that travel through the edges of the network. 
Every packet has a different color depending on the type. The colors are as follows:

| **Packet Type** | **Color** |
|------------------|-----------|
| HTTP             | <span style="color:white;">Burgundy</span> <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background-color:#6d071a;"></span> |
| TCP              | <span style="color:white;">Hazel</span> <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background-color:#d99802;"></span> |
| ICMP-8           | <span style="color:white;">Red</span> <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background-color:#ff0000;"></span> |
| ICMP-0           | <span style="color:white;">Yellow</span> <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background-color:#ffff00;"></span> |
| ARP              | <span style="color:white;">Green</span> <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background-color:#00ff00;"></span> |

You can also see the type of the packets while hovering them.

<p align="center">
  <img src="./img/22_Hovering_Packet.gif" alt="Packet Hover" />
</p>

When you select a packet, it will show the information of the packet in the right bar. This information varies depending on the type of packet and the current layer. The packets are visible on different layers depending on their type.

<p align="center">
  <img src="./img/24_Packet_Data.png" alt="Packet Data" />
</p>

The information shown in the right bar when selecting a packet is as follows:
- **Packet Type**: The type of the packet.
- **Source Ip Address**: The IP address of the source device.
- **Destination Ip Address**: The IP address of the destination device.
- **Discard Packet Button**: This button allows you to discard the packet from the network. This will stop the packet from reaching its destination. 
- **More details Dropdown**: This dropdown allows you to see more details about the packet. The details shown depend on the type of packet and the current layer.

### HTTP Packet

### TCP Packet

### ICMP-8 Packet

ICMP-8 packets, also known as ICMP Echo Request packets, are a type of message used by the Internet Control Message Protocol (ICMP). They are primarily used for diagnostic and network testing purposes, most notably by the ping command.

In the simulator, ICMP-8 packets show different information depending on the current layer. 

#### Visibility

ICMP-8 packets are not visible on the App Layer and the Transport Layer.

On the Network Layer, they show the following information:
- **IP Version**: The version of the IP protocol used. For now, only IPv4 is supported.
- **Internet Header Length**: The length of the IP header in 32-bit words. 
- **Type of Service**: The type of service field in the IP header. This field is used to specify the quality of service for the packet.
- **Total Length**: The total length of the packet in bytes. This includes the IP header and the data.
- **Identification**: A unique identifier for the packet. This is used to identify the packet in case it is fragmented.
- **Fragmentation Offset**: The offset of the packet in case it is fragmented. This is used to reassemble the packet at the destination.
- **Time to Live**: The time to live field in the IP header. This field is used to specify the maximum number of hops that the packet can take before it is discarded.
- **Protocol**: The protocol used in the packet. For ICMP-8 packets, this is always 1.
- **Header Checksum**: The checksum of the IP header. This is used to verify the integrity of the packet.
- **Payload**: This is the data that is being sent in the packet. In this case, it is the ICMP-8 packet payload includes:
  - **Type**: For ICMP-8 packets, this is always 8.
  - **Code**: For ICMP-8 packets, this is always 0.
  - **Identifier**: This is used to match the request and reply packets.
  - **Sequence Number**: This is used to match the request and reply packets.
  - **Data**: For ICMP-8 packets, this is always empty because it is used for testing purposes.
  
<p align="center">
  <img src="./img/23_ICMP_8_Network.gif" alt="ICMP-8 Network Layer" />
</p>

On the Link Layer, they only show the EtherType field. This field is used to specify the protocol used in the packet. For ICMP-8 packets, this is always 2048.

### ICMP-0 Packet

ICMP-0 packets, also known as ICMP Echo Reply packets, are a type of message used by the Internet Control Message Protocol (ICMP). They are primarily used for diagnostic and network testing purposes, most notably by the ping command.

#### Visibility

ICMP-0 packets visible on the same layers as [ICMP-8](#icmp-8-packet) packets. The information shown is really similar to the one shown for ICMP-8 packets. The only difference is the type of the packet on the payload. For ICMP-0 packets, the type is always 0.

<p align="center">
  <img src="./img/25_ICMP_0_Network.gif" alt="ICMP-0 Network Layer" />
</p>

Just like ICMP-8 packets, on the Link Layer, they only show the EtherType field which is always 2048.

### ARP Packet

## Tables

### Routing Table

### Switch Table

### ARP Table

## Misc

### Settings
On the right corner of the top bar, you can find the settings button. This button will open a modal with a list of different [keyboard shortcuts](#keyboard-shortcuts) and some configuration options.

The configuration options are:
- **Enable Tooltips**: This option enables or disables the tooltips that show the information of some buttons and entries of the simulator when hovering over them. It is enabled by default.
- **Use TCP Reno**: This option enables or disables the TCP Reno algorithm. This algorithm is used to control the flow of data in the network. It is enabled by default. If disabled, the TCP Tahoe algorithm will be used instead. 

<p align="center">
  <img src="./img/28_Settings.gif" alt="Settings" />
</p>

### Loading and Saving

The simulator will save the current network on your browser's local storage. This means that if you close the browser or refresh the page, the network will still be there when you open the simulator again.

However if you need to persist the network for safety or to share it with someone else, you can save the network to a JSON file. To do this, just press the Save button on the top bar and the current network will be saved automaticaly. The file will be saved as a JSON file with the name "networkGraph.json" on your Downloads folder.

<p align="center">
  <img src="./img/26_Save.gif" alt="Save network" />
</p>

To load a network from a JSON file, just press the Load button on the top bar and select the JSON file you want to load. The network will be loaded and the simulator will update to show the new network. If the network is not valid, the simulator will show an error message and the network will not be loaded.

<p align="center">
  <img src="./img/27_Load.gif" alt="Load network" />
</p>

### Print Canvas

The simulator has a print button that allows you to take a snapshot of the current network and save it as a .png image. To do this, just press the Print button on the top bar and the current network will be saved as a .png image with the name "viewport-snapshot.png" on your Downloads folder.

<p align="center">
  <img src="./img/29_Print.gif" alt="Print network" />
</p>

### Keyboard Shortcuts

The simulator has some keyboard shortcuts to make it easier to use. The shortcuts are as follows:

- **C**: Connect a device to another device. This is the same as pressing the Connect Device button on the right bar. It will only work if the devices involved hace free interfaces.
- **H**: Open the help modal. This is the same as pressing the Help button on the top bar.
- **Delete/Backspace**: Delete the selected device, edge or packet. This is the same as pressing the Delete Device, Delete Edge and Discard Packet buttons on the right bar.
- **SpaceBar**: Play or pause the simulation. This is the same as pressing the Play/Pause button on the canvas.
- **Ctrl + Z**: Undo the last action. Is the same as pressing the Undo button on the top bar.
- **Ctrl + Y**: Redo the last action. Is the same as pressing the Redo button on the top bar.
- **Ctrl + S**: Save the current network. Is the same as pressing the Save button on the top bar.
- **N**: Create a new network. Is the same as pressing the New button on the top bar.
- **S**: Save the current network into a JSON file. Is the same as pressing the Save button on the top bar.
- **L**: Load a network from a JSON file. Is the same as pressing the Load button on the top bar.
- **P**: Print the current network on the canvas. Is the same as pressing the Print button on the top bar.

# Development

To run the local development server, use `npm run start`

For building the artifacts, use `npm run build`

For checking code format and lint, use `npm run lint`
