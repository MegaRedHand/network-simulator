import * as ip from "../src/packets/ip";

function expectStringToParseAsIpAddress(str: string, expectedOctets: number[]) {
  const expected = new ip.IpAddress(Uint8Array.from(expectedOctets));
  expect(ip.IpAddress.parse(str)).toEqual(expected);
}

describe("IP module", () => {
  test("parsing IPv4 address works", () => {
    expectStringToParseAsIpAddress("192.168.1.1", [192, 168, 1, 1]);
    expectStringToParseAsIpAddress("0.0.0.0", [0, 0, 0, 0]);
    expectStringToParseAsIpAddress("255.255.255.255", [255, 255, 255, 255]);
  });
  test("computing checksum results in valid checksum", () => {
    const packet = new ip.IPv4Packet(
      new ip.IpAddress(new Uint8Array([192, 168, 1, 1])),
      new ip.IpAddress(new Uint8Array([192, 168, 1, 2])),
      new ip.EmptyPayload(),
    );
    expect(packet.validateChecksum()).toBe(true);
  });
});
