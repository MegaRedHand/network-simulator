# GEduNet 🌐

_GEduNet_ is an Graphical Educational Computer Network Simulator.
It's meant as an aid to students trying to understand computer networks, along with their teachers.

The project runs on the browser and is hosted in GitHub Pages.
You can access it [here](https://megaredhand.github.io/network-simulator/).

# Gedunet User Manual

![Preview of the simulator. Shows multiple hosts, routers and switches. Some network packets are being sent through the network.](./img/0_full-preview.png)

## Getting Started

Welcome to the GEduNet simulator! This application is designed to help you visualize and understand computer networks.

GEduNet consists of 4 main components on screen:

1. Right bar: Shows information about the selected device.
2. Left bar: Contains buttons to add devices to the network.
3. Canvas: The main area where the network is displayed.
4. Top bar: Contains the simulation file controls, help and settings.

![Components of the App](./img/1_Start_Colores.jpg)

### Left Bar

The left bar contains buttons to add devices to the network. You can add the following devices:

- **Host**: A computer or device that connects to the network.
- **Router**: A device that forwards data packets between computer networks.
- **Switch**: A device that connects devices within a single network and uses MAC addresses to forward data to the correct destination.

In order to add a device, just click on the corresponding button and the selected device will appear in the center of the canvas.

<p align="center">
  <img src="./img/2_Add_device.gif" alt="Adding a Device" />
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
  <img src="./img/3_Select_Device.gif" alt="Selecting Device" />
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
  <img src="./img/4_Top_Bar_Overview.gif" alt="Top Bar Overview" />
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
  <img src="./img/5_Canvas_Overview.gif" alt="Canvas Overview" />
</p>


## Development

To run the local development server, use `npm run start`

For building the artifacts, use `npm run build`

For checking code format and lint, use `npm run lint`
