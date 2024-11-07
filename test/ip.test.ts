import * as ip from "../src/packets/ip";

describe("IP module", () => {
  test("computing checksum results in valid checksum", () => {
    const packet = new ip.IPv4Packet(
      new ip.IpAddress(new Uint8Array([192, 168, 1, 1])),
      new ip.IpAddress(new Uint8Array([192, 168, 1, 2])),
      new ip.EmptyPayload(),
    );
    expect(packet.validateChecksum()).toBe(true);
  });
});
