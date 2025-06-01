import { IpAddress } from "../src/packets/ip";
import { Flags, TcpSegment } from "../src/packets/tcp";

describe("TCP module", () => {
  test("constructor works", () => {
    new TcpSegment(0, 0, 0, 0, new Flags(), Uint8Array.of());
    new TcpSegment(
      0xffff,
      0xffff,
      0xffffffff,
      0xffffffff,
      new Flags(),
      Uint8Array.of(),
    );
  });

  const flags = new Flags().withAck().withRst();

  let testSegment = new TcpSegment(
    0x4e0,
    0xbf08,
    0,
    0x9b84d209,
    flags,
    Uint8Array.of(),
  );
  testSegment.window = 0;
  const ipAddress = IpAddress.parse("127.0.0.1");

  test("Checksum works", () => {
    const expectedChecksum = 0x8057;
    expect(testSegment.checksum(ipAddress, ipAddress)).toBe(expectedChecksum);
  });

  test("toBytes works", () => {
    const bytes = Uint8Array.from([
      // Source port
      0x04, 0xe0,
      // Destination port
      0xbf, 0x08,
      // Sequence Number
      0x00, 0x00, 0x00, 0x00,
      // Acknowledgment Number
      0x9b, 0x84, 0xd2, 0x09,
      // Data offset (4 bits) = 5
      // Reserved (4 bits) = 0
      // Flags (RST+ACK) = 0x14
      0x50, 0x14,
      // Window
      0x00, 0x00,
      // Checksum
      0x80, 0x57,
      // Urgent pointer
      0x00, 0x00,
      // No data
    ]);
    expect(
      testSegment
        .toBytes({
          srcIpAddress: IpAddress.parse("127.0.0.1"),
          dstIpAddress: IpAddress.parse("127.0.0.1"),
        })
        .toString(),
    ).toBe(bytes.toString());
  });
});
