import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateAddress, detectAddressType } from "../src/address/index.js";

describe("validateAddress — EVM valid", () => {
  it("validates standard lowercase address", () => {
    const result = validateAddress("0xde709f2102306220921060314715629080e2fb77");
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "evm");
  });

  it("validates standard uppercase address", () => {
    const result = validateAddress("0xDE709F2102306220921060314715629080E2FB77");
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "evm");
  });

  it("validates mixed case EIP-55 address", () => {
    const result = validateAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
    assert.equal(result.isValid, true);
  });

  it("validates zero address", () => {
    const result = validateAddress("0x0000000000000000000000000000000000000000");
    assert.equal(result.isValid, true);
  });

  it("validates with explicit chainType evm", () => {
    const result = validateAddress(
      "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
      "evm",
    );
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "evm");
  });

  it("returns checksummed address (lowercase placeholder)", () => {
    const result = validateAddress("0xDE709F2102306220921060314715629080E2FB77");
    assert.equal(
      result.checksummed,
      "0xde709f2102306220921060314715629080e2fb77",
    );
  });

  it("sets type to unknown for pure validation", () => {
    const result = validateAddress("0xde709f2102306220921060314715629080e2fb77");
    assert.equal(result.type, "unknown");
  });
});

describe("validateAddress — EVM invalid", () => {
  it("rejects too short address", () => {
    const result = validateAddress("0x1234");
    assert.equal(result.isValid, false);
  });

  it("rejects too long address", () => {
    const result = validateAddress("0xde709f2102306220921060314715629080e2fb77ff");
    assert.equal(result.isValid, false);
  });

  it("rejects non-hex characters", () => {
    const result = validateAddress("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG");
    assert.equal(result.isValid, false);
  });

  it("rejects address without prefix (auto-detects as evm default)", () => {
    // "de709..." doesn't start with 0x, 1, 3, bc1, or tb1 → defaults to evm
    const result = validateAddress("de709f2102306220921060314715629080e2fb77");
    assert.equal(result.isValid, false);
  });

  it("rejects empty string", () => {
    const result = validateAddress("");
    assert.equal(result.isValid, false);
  });
});

describe("validateAddress — Bitcoin valid", () => {
  it("validates P2PKH mainnet address (Satoshi's)", () => {
    const result = validateAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "bitcoin");
  });

  it("validates P2SH address", () => {
    const result = validateAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy");
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "bitcoin");
  });

  it("validates Bech32 mainnet address", () => {
    const result = validateAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "bitcoin");
  });

  it("validates Bech32 testnet address", () => {
    const result = validateAddress("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx");
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "bitcoin");
  });

  it("validates with explicit chainType bitcoin", () => {
    const result = validateAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin");
    assert.equal(result.isValid, true);
    assert.equal(result.chainType, "bitcoin");
  });
});

describe("validateAddress — Bitcoin invalid", () => {
  it("rejects wrong prefix (auto-detects as evm)", () => {
    const result = validateAddress("2J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy");
    // Starts with "2" → defaults to evm, fails evm validation
    assert.equal(result.isValid, false);
  });

  it("rejects too short P2PKH", () => {
    const result = validateAddress("1A", "bitcoin");
    assert.equal(result.isValid, false);
  });
});

describe("validateAddress — chain type auto-detection", () => {
  it("detects 0x prefix as evm", () => {
    const result = validateAddress("0xde709f2102306220921060314715629080e2fb77");
    assert.equal(result.chainType, "evm");
  });

  it("detects 1 prefix as bitcoin", () => {
    const result = validateAddress("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    assert.equal(result.chainType, "bitcoin");
  });

  it("detects 3 prefix as bitcoin", () => {
    const result = validateAddress("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy");
    assert.equal(result.chainType, "bitcoin");
  });

  it("detects bc1 prefix as bitcoin", () => {
    const result = validateAddress("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    assert.equal(result.chainType, "bitcoin");
  });

  it("detects tb1 prefix as bitcoin", () => {
    const result = validateAddress("tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx");
    assert.equal(result.chainType, "bitcoin");
  });

  it("defaults unknown prefix to evm", () => {
    const result = validateAddress("xyz123");
    assert.equal(result.chainType, "evm");
  });
});

describe("detectAddressType", () => {
  it("detects contract address", async () => {
    const mockClient = {
      execute: async () => ({ success: true, data: "0x6060604052" }),
    };
    const result = await detectAddressType(
      "0xde709f2102306220921060314715629080e2fb77",
      mockClient,
    );
    assert.equal(result.type, "contract");
  });

  it("detects EOA address (code is 0x)", async () => {
    const mockClient = {
      execute: async () => ({ success: true, data: "0x" }),
    };
    const result = await detectAddressType(
      "0xde709f2102306220921060314715629080e2fb77",
      mockClient,
    );
    assert.equal(result.type, "eoa");
  });

  it("detects EOA when data is empty", async () => {
    const mockClient = {
      execute: async () => ({ success: true, data: "" }),
    };
    const result = await detectAddressType(
      "0xde709f2102306220921060314715629080e2fb77",
      mockClient,
    );
    assert.equal(result.type, "eoa");
  });

  it("returns unknown on client error", async () => {
    const mockClient = {
      execute: async () => {
        throw new Error("RPC error");
      },
    };
    const result = await detectAddressType(
      "0xde709f2102306220921060314715629080e2fb77",
      mockClient,
    );
    assert.equal(result.type, "unknown");
  });

  it("returns early for invalid address without calling client", async () => {
    let clientCalled = false;
    const mockClient = {
      execute: async () => {
        clientCalled = true;
        return { success: true, data: "0x" };
      },
    };
    const result = await detectAddressType("0xinvalid", mockClient);
    assert.equal(result.isValid, false);
    assert.equal(clientCalled, false);
  });
});
