# GEduNet 🌐

_GEduNet_ is an Graphical Educational Computer Network Simulator.
It's meant as an aid to students trying to understand computer networks, along with their teachers.

The project runs on the browser and is hosted in GitHub Pages.
You can access it [here](https://megaredhand.github.io/network-simulator/).

# **GEduNet - User Manual** 📘

![Preview of the simulator. Shows multiple hosts, routers and switches. Some network packets are being sent through the network.](./img/00_full-preview.png)

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

## Devices and Edges

### Host

<p align="center">
  <img src="./src/assets/server.svg" alt="Server" width="25%" style="background-color: white;border-radius: 10px;" />
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
  devices if the host and the other device have free interfaces. This button has a keyboard shortcut. Pressing **C** and then clicking
  on another device will also connect the devices, if they have free interfaces. (?)
- **Delete Device Button**: This button allows you to delete the host from the network. This will also delete all edges connected to this host.
- **Program Runner Section**: This section includes a dropdown to select a program and a second button to start the program after
  selecting the program inputs.
- **ARP Table**: This table shows the translation of the different IP Adresses translations into MAC Adresses. It also allows to edit and refresh these translations. (?)

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
- **Connect Device Button**: This button allows you to connect the host to another device. First press the Connect Device button and then click on the device you want to connect to. This will create an edge between the two devices. You can only connect
  devices if the host and the other device have free interfaces. This button has a keyboard shortcut. Pressing **C** and then clicking
  on another device will also connect the devices, if they have free interfaces. (?)
- **Delete Device Button**: This button allows you to delete the router from the network. This will also delete all edges connected to this router.
- **Packet Queue Usage Bar**: This bar shows the usage of the packet queue of the router. The packet queue is used to store packets that are waiting to be processed by the router. The bar shows the percentage of the queue that is currently in use. If the queue is full, the router will drop packets until there is space in the queue.
- **Router Parameters Dropdown**: This dropdown allows you to select the parameters of the router. The parameters are:
  - **Packet Queue Size [bytes]**: The amount of bytes that the router can store in its queue. This is the maximum size of the queue. The default value is 1024 bytes.
  - **Packet Processing Speed [ms/byte]**: The time it takes for the router to process a packet. The default value is 8 miliseconds.
- **Routing Table**: The routing table is a data structure used by routers to determine the best path for forwarding packets to their destination. It contains the IP, the Nework Mask and the selected interface. You can edit the entries of the table to fit your desired routing scheme. You can also restore the default state of the table by pressing the reset button on the top right corner. (?)
- **ARP Table**: This table shows the translation of the different IP Adresses translations into MAC Adresses. It also allows to edit and refresh these translations. (?)

#### Router Hover

Hovering on a Router will show the IP address. If the simulator is set on the Link Layer, it will also show the MAC address.

<p align="center">
  <img src="./img/10_Router_Overview.gif" alt="Router Overview" />
</p>

### Switch

<p align="center">
  <img src="./src/assets/switch.svg" alt="Switch" width="25%" style="background-color: white;border-radius: 10px;" />
</p>

### Edge

## Development

To run the local development server, use `npm run start`

For building the artifacts, use `npm run build`

For checking code format and lint, use `npm run lint`
