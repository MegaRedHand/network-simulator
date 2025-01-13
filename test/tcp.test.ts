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
});
