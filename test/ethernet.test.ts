import * as eth from "../src/packets/ethernet";
import { EmptyPayload, IpAddress, IPv4Packet } from "../src/packets/ip";

function expectStringToParseAsMacAddress(
  str: string,
  expectedOctets: number[],
) {
  const expected = new eth.MacAddress(Uint8Array.from(expectedOctets));
  expect(eth.MacAddress.parse(str)).toEqual(expected);
}

describe("MacAddress", () => {
  test("parsing works", () => {
    expectStringToParseAsMacAddress(
      "00:1b:63:84:45:e6",
      [0x00, 0x1b, 0x63, 0x84, 0x45, 0xe6],
    );
  });
});

describe("EthernetFrame", () => {
  test("crc is correct", () => {
    // Values from https://stackoverflow.com/a/60793979
    const dst = eth.MacAddress.parse("20:cf:30:1a:ce:a1");
    const src = eth.MacAddress.parse("62:38:e0:c2:bd:30");

    // TODO: clean up this
    const ipPayload = new EmptyPayload();
    const ipSrc = IpAddress.parse("0.0.0.0");
    const ipDst = IpAddress.parse("0.0.0.0");
    const framePayload = new IPv4Packet(ipSrc, ipDst, ipPayload);

    // Hack the expected payload into the frame payload
    const expectedPayload = Uint8Array.from([
      0x00, 0x01, 0x08, 0x00, 0x06, 0x04, 0x00, 0x01, 0x62, 0x38, 0xe0, 0xc2,
      0xbd, 0x30, 0x0a, 0x2a, 0x2a, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x0a, 0x2a, 0x2a, 0x02,
    ]);
    framePayload.toBytes = () => expectedPayload;
    framePayload.type = () => eth.ARP_PROTOCOL_TYPE;

    const frame = new eth.EthernetFrame(src, dst, framePayload);

    const expectedCrc = "6026b722";
    expect(frame.crc.toString(16)).toEqual(expectedCrc);
  });
  test("toBytes is correct", () => {
    // Values from https://stackoverflow.com/a/60793979
    const expected = Uint8Array.from([
      // Destination
      0x20, 0xcf, 0x30, 0x1a, 0xce, 0xa1,
      // Source
      0x62, 0x38, 0xe0, 0xc2, 0xbd, 0x30,
      // Type (ARP)
      0x08, 0x06,
      // Payload
      0x00, 0x01, 0x08, 0x00, 0x06, 0x04, 0x00, 0x01, 0x62, 0x38, 0xe0, 0xc2,
      0xbd, 0x30, 0x0a, 0x2a, 0x2a, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x0a, 0x2a, 0x2a, 0x02,
      // Padding
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // CRC
      0x22, 0xb7, 0x26, 0x60,
    ]);
    const dst = eth.MacAddress.parse("20:cf:30:1a:ce:a1");
    const src = eth.MacAddress.parse("62:38:e0:c2:bd:30");

    // TODO: clean up this
    const ipPayload = new EmptyPayload();
    const ipSrc = IpAddress.parse("0.0.0.0");
    const ipDst = IpAddress.parse("0.0.0.0");
    const framePayload = new IPv4Packet(ipSrc, ipDst, ipPayload);

    // Hack the expected payload into the frame payload
    const expectedPayload = Uint8Array.from([
      0x00, 0x01, 0x08, 0x00, 0x06, 0x04, 0x00, 0x01, 0x62, 0x38, 0xe0, 0xc2,
      0xbd, 0x30, 0x0a, 0x2a, 0x2a, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x0a, 0x2a, 0x2a, 0x02,
    ]);
    framePayload.toBytes = () => expectedPayload;
    framePayload.type = () => eth.ARP_PROTOCOL_TYPE;

    const frame = new eth.EthernetFrame(src, dst, framePayload);
    expect(frame.toBytes().toString()).toEqual(expected.toString());
  });
});
