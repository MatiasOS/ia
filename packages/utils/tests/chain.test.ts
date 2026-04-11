import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  satoshiToBtc,
  btcToSatoshi,
  normalizeChainId,
  isBitcoinChain,
  isEVMChain,
  buildVerifyUrl,
  buildVerificationLinks,
} from "../src/chain/index.js";

describe("satoshiToBtc", () => {
  it("converts 1 BTC in satoshis", () => {
    assert.equal(satoshiToBtc(100_000_000), "1");
  });

  it("converts zero", () => {
    assert.equal(satoshiToBtc(0), "0");
  });

  it("converts 1 satoshi", () => {
    assert.equal(satoshiToBtc(1), "0.00000001");
  });

  it("converts 0.5 BTC in satoshis", () => {
    assert.equal(satoshiToBtc(50_000_000), "0.5");
  });

  it("converts max BTC supply (21M BTC in sats)", () => {
    assert.equal(satoshiToBtc(2_100_000_000_000_000), "21000000");
  });

  it("accepts BigInt input", () => {
    assert.equal(satoshiToBtc(100_000_000n), "1");
  });

  it("converts 10000 satoshis", () => {
    assert.equal(satoshiToBtc(10_000), "0.0001");
  });
});

describe("btcToSatoshi", () => {
  it("converts 1 BTC", () => {
    assert.equal(btcToSatoshi("1"), 100_000_000n);
  });

  it("converts zero", () => {
    assert.equal(btcToSatoshi("0"), 0n);
  });

  it("converts 1 satoshi worth of BTC", () => {
    assert.equal(btcToSatoshi("0.00000001"), 1n);
  });

  it("converts 0.5 BTC", () => {
    assert.equal(btcToSatoshi("0.5"), 50_000_000n);
  });

  it("accepts number input", () => {
    assert.equal(btcToSatoshi(1), 100_000_000n);
  });

  it("converts max BTC supply", () => {
    assert.equal(btcToSatoshi("21000000"), 2_100_000_000_000_000n);
  });
});

describe("satoshiToBtc / btcToSatoshi round-trip", () => {
  it("round-trips 1 BTC", () => {
    assert.equal(btcToSatoshi(satoshiToBtc(100_000_000)), 100_000_000n);
  });

  it("round-trips 0.5 BTC", () => {
    assert.equal(btcToSatoshi(satoshiToBtc(50_000_000)), 50_000_000n);
  });
});

describe("normalizeChainId", () => {
  it("passes through number chain ID", () => {
    assert.equal(normalizeChainId(1), 1);
  });

  it("preserves BIP122 string", () => {
    const bip122 = "bip122:000000000019d6689c085ae165831e93";
    assert.equal(normalizeChainId(bip122), bip122);
  });

  it("parses string EVM chain ID to number", () => {
    assert.equal(normalizeChainId("1"), 1);
  });

  it("parses string polygon chain ID", () => {
    assert.equal(normalizeChainId("137"), 137);
  });

  it("returns NaN for non-numeric string", () => {
    assert.equal(Number.isNaN(normalizeChainId("not-a-chain") as number), true);
  });
});

describe("isBitcoinChain", () => {
  it("returns true for bip122 string", () => {
    assert.equal(isBitcoinChain("bip122:000000000019d6689c085ae165831e93"), true);
  });

  it("returns false for number", () => {
    assert.equal(isBitcoinChain(1), false);
  });

  it("returns false for non-bip122 string", () => {
    assert.equal(isBitcoinChain("1"), false);
  });
});

describe("isEVMChain", () => {
  it("returns true for number", () => {
    assert.equal(isEVMChain(1), true);
  });

  it("returns false for bip122 string", () => {
    assert.equal(isEVMChain("bip122:000000000019d6689c085ae165831e93"), false);
  });

  it("returns true for non-bip122 string", () => {
    assert.equal(isEVMChain("1"), true);
  });
});

describe("isBitcoinChain / isEVMChain are mutually exclusive", () => {
  it("number is EVM only", () => {
    assert.equal(isEVMChain(1), true);
    assert.equal(isBitcoinChain(1), false);
  });

  it("bip122 is Bitcoin only", () => {
    const bip122 = "bip122:000000000019d6689c085ae165831e93";
    assert.equal(isBitcoinChain(bip122), true);
    assert.equal(isEVMChain(bip122), false);
  });
});

describe("buildVerifyUrl", () => {
  it("builds chain-only URL when no address/tx/block", () => {
    assert.equal(buildVerifyUrl({ chainId: 1 }), "https://openscan.eth.link/#/1");
  });

  it("builds address URL", () => {
    assert.equal(
      buildVerifyUrl({ chainId: 1, address: "0xABC" }),
      "https://openscan.eth.link/#/1/address/0xABC",
    );
  });

  it("builds tx URL", () => {
    assert.equal(
      buildVerifyUrl({ chainId: 137, txHash: "0xTX" }),
      "https://openscan.eth.link/#/137/tx/0xTX",
    );
  });

  it("builds block URL", () => {
    assert.equal(
      buildVerifyUrl({ chainId: 8453, blockNumber: 12345 }),
      "https://openscan.eth.link/#/8453/block/12345",
    );
  });

  it("prioritizes txHash over address", () => {
    assert.equal(
      buildVerifyUrl({ chainId: 1, address: "0xABC", txHash: "0xTX" }),
      "https://openscan.eth.link/#/1/tx/0xTX",
    );
  });

  it("prioritizes address over blockNumber", () => {
    assert.equal(
      buildVerifyUrl({ chainId: 1, address: "0xABC", blockNumber: 100 }),
      "https://openscan.eth.link/#/1/address/0xABC",
    );
  });

  it("handles string chainId", () => {
    assert.equal(buildVerifyUrl({ chainId: "42161" }), "https://openscan.eth.link/#/42161");
  });

  it("handles blockNumber 0", () => {
    assert.equal(
      buildVerifyUrl({ chainId: 1, blockNumber: 0 }),
      "https://openscan.eth.link/#/1/block/0",
    );
  });
});

describe("buildVerificationLinks", () => {
  it("returns an array with one link", () => {
    const links = buildVerificationLinks({ chainId: 1, address: "0xABC" });
    assert.equal(links.length, 1);
    assert.equal(links[0], "https://openscan.eth.link/#/1/address/0xABC");
  });

  it("returns chain-only link when no specifics", () => {
    const links = buildVerificationLinks({ chainId: 137 });
    assert.deepEqual(links, ["https://openscan.eth.link/#/137"]);
  });
});
