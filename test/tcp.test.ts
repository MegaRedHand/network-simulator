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

  const testSegment = new TcpSegment(
    0x4e0,
    0x9690,
    0,
    0xe4d3ebe2,
    flags,
    Uint8Array.of(),
  );

  test("toBytes works", () => {
    const bytes = Uint8Array.from([
      // Source port
      0x04, 0xe0,
      // Destination port
      0x96, 0x90,
      // Sequence Number
      0x00, 0x00, 0x00, 0x00,
      // Acknowledgment Number
      0xe4, 0xd3, 0xeb, 0xe2,
      // Data offset (4 bits) = 5
      // Reserved (4 bits) = 0
      // Flags (RST+ACK) = 0x14
      0x50, 0x14,
      // Window
      0x00, 0x00,
      // Checksum
      0x45, 0xa7,
      // Urgent pointer
      0x00, 0x00,
      // No data
    ]);
    expect(testSegment.toBytes().toString()).toBe(bytes.toString());
  });
});
