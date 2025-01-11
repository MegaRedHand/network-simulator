import * as eth from "../src/packets/ethernet";

function expectStringToParseAsMacAddress(
  str: string,
  expectedOctets: number[],
) {
  const expected = new eth.MacAddress(Uint8Array.from(expectedOctets));
  expect(eth.MacAddress.parse(str)).toEqual(expected);
}

describe("Ethernet module", () => {
  test("parsing MAC address works", () => {
    expectStringToParseAsMacAddress(
      "00:1b:63:84:45:e6",
      [0x00, 0x1b, 0x63, 0x84, 0x45, 0xe6],
    );
  });
});
