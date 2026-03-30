import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hexToNumber,
  numberToHex,
  hexToUtf8,
  padHex,
  isHexString,
  stripTrailingZeros,
} from "../src/hex/index.js";

describe("hexToNumber", () => {
  it("converts 0x0 to 0n", () => {
    assert.equal(hexToNumber("0x0"), 0n);
  });

  it("converts 0xff to 255n", () => {
    assert.equal(hexToNumber("0xff"), 255n);
  });

  it("converts 0x1 to 1n", () => {
    assert.equal(hexToNumber("0x1"), 1n);
  });

  it("converts 0x10 to 16n", () => {
    assert.equal(hexToNumber("0x10"), 16n);
  });

  it("converts max uint256", () => {
    const maxUint256 = 2n ** 256n - 1n;
    assert.equal(
      hexToNumber("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
      maxUint256,
    );
  });

  it("throws on missing 0x prefix", () => {
    assert.throws(() => hexToNumber("ff"), /Invalid hex string/);
    assert.throws(() => hexToNumber("abc"), /Invalid hex string/);
  });

  it("throws on empty string", () => {
    assert.throws(() => hexToNumber(""));
  });
});

describe("numberToHex", () => {
  it("converts 0 to 0x0", () => {
    assert.equal(numberToHex(0), "0x0");
  });

  it("converts 255 to 0xff", () => {
    assert.equal(numberToHex(255), "0xff");
  });

  it("converts 16 to 0x10", () => {
    assert.equal(numberToHex(16), "0x10");
  });

  it("converts 0n bigint to 0x0", () => {
    assert.equal(numberToHex(0n), "0x0");
  });

  it("converts large bigint (max uint256)", () => {
    const maxUint256 = 2n ** 256n - 1n;
    assert.equal(
      numberToHex(maxUint256),
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    );
  });

  it("handles negative numbers", () => {
    // BigInt(-1).toString(16) produces "-1"
    assert.equal(numberToHex(-1), "0x-1");
  });

  it("round-trips with hexToNumber for positive values", () => {
    const values = [0, 1, 255, 65535, 1000000];
    for (const v of values) {
      assert.equal(hexToNumber(numberToHex(v)), BigInt(v));
    }
  });
});

describe("hexToUtf8", () => {
  it("decodes Hello World!", () => {
    assert.equal(hexToUtf8("0x48656c6c6f20576f726c6421"), "Hello World!");
  });

  it("works without 0x prefix", () => {
    assert.equal(hexToUtf8("48656c6c6f"), "Hello");
  });

  it("skips null bytes", () => {
    assert.equal(hexToUtf8("0x48656c6c6f000000"), "Hello");
  });

  it("returns empty string for empty hex", () => {
    assert.equal(hexToUtf8("0x"), "");
  });

  it("returns empty string for all null bytes", () => {
    assert.equal(hexToUtf8("0x000000"), "");
  });

  it("decodes single character", () => {
    assert.equal(hexToUtf8("0x41"), "A");
  });
});

describe("padHex", () => {
  it("pads 0xff to 32 bytes", () => {
    const result = padHex("0xff", 32);
    assert.equal(result, "0x00000000000000000000000000000000000000000000000000000000000000ff");
    assert.equal(result.length, 2 + 64); // 0x + 64 hex chars
  });

  it("pads without 0x prefix", () => {
    assert.equal(padHex("ff", 4), "0x000000ff");
  });

  it("returns unchanged if already at target length", () => {
    assert.equal(padHex("0xdeadbeef", 4), "0xdeadbeef");
  });

  it("does not truncate if longer than target", () => {
    assert.equal(padHex("0xdeadbeefcafe", 4), "0xdeadbeefcafe");
  });

  it("pads to 1 byte", () => {
    assert.equal(padHex("0x1", 1), "0x01");
  });
});

describe("isHexString", () => {
  it("returns true for empty hex (0x)", () => {
    assert.equal(isHexString("0x"), true);
  });

  it("returns true for valid lowercase hex", () => {
    assert.equal(isHexString("0xdeadbeef"), true);
  });

  it("returns true for valid uppercase hex", () => {
    assert.equal(isHexString("0xDEADBEEF"), true);
  });

  it("returns true for 0x0", () => {
    assert.equal(isHexString("0x0"), true);
  });

  it("returns true for mixed case", () => {
    assert.equal(isHexString("0xDeAdBeEf"), true);
  });

  it("returns false without 0x prefix", () => {
    assert.equal(isHexString("deadbeef"), false);
  });

  it("returns false for non-hex characters", () => {
    assert.equal(isHexString("0xGG"), false);
  });

  it("returns false for empty string", () => {
    assert.equal(isHexString(""), false);
  });

  it("returns false for mixed valid/invalid chars", () => {
    assert.equal(isHexString("0x123xyz"), false);
  });

  it("returns false for just 0X (uppercase prefix)", () => {
    assert.equal(isHexString("0X"), false);
  });
});

describe("stripTrailingZeros", () => {
  it("strips trailing zero bytes", () => {
    assert.equal(stripTrailingZeros("0xdeadbeef0000"), "0xdeadbeef");
  });

  it("returns unchanged if no trailing zeros", () => {
    assert.equal(stripTrailingZeros("0xdeadbeef"), "0xdeadbeef");
  });

  it("returns 0x for all zeros", () => {
    assert.equal(stripTrailingZeros("0x0000"), "0x");
  });

  it("only strips trailing zero pairs", () => {
    assert.equal(stripTrailingZeros("0xdead00beef00"), "0xdead00beef");
  });

  it("works without 0x prefix", () => {
    assert.equal(stripTrailingZeros("beef0000"), "0xbeef");
  });

  it("strips single trailing zero byte", () => {
    assert.equal(stripTrailingZeros("0xbeef00"), "0xbeef");
  });

  it("handles multiple trailing zero bytes", () => {
    assert.equal(stripTrailingZeros("0xab000000"), "0xab");
  });
});
