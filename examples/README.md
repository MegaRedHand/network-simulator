# Examples

This directory has some example networks ready to be loaded into the simulator.
We also include some information on each example here.

## [HTTP Client-Server](./httpClientServer.json)

This example includes three hosts and two routers, simulating a server and multiple clients that communicate through the internet.
To see it in action, run the HTTP request program in one of the clients, selecting the HTTP server as the destination.

## [Local network](./localNetwork.json)

This example includes three hosts connected by a single switch, simulating a local area network.
A good place to check how ARP requests work!

## [Misconfigured router](./misconfiguredRouter.json)

This example includes two hosts connected through a loop of three routers.
One of the hosts is running the "Echo server" program, which regularly sends ICMP echo packets.
However, the packets don't ever reach the other host, since one of the router's routing tables is misconfigured.
The routing table entry for the receiving host instead points to the next router on the loop, causing the packet to be forever lost in the network.
After a while, the packets are dropped due to their TTL decreasing to zero.

## [Subnetting](./subnetting.json)

This example includes multiple hosts, routers, and switches.
Each host represents a group of hosts, shown in their tags.
It was inspired by an exercise on subnet partitioning and routing table configuration.
