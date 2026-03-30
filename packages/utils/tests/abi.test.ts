import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeABI, encodeABI } from "../src/abi/index.js";
import type { AbiFunction } from "../src/abi/index.js";

// Not exported from index, test via re-import
import { functionSelector } from "../src/abi/index.js";

describe("functionSelector (placeholder)", () => {
  it("throws with expected message", () => {
    assert.throws(() => functionSelector("transfer(address,uint256)"), /keccak256/);
  });
});

describe("encodeABI (placeholder)", () => {
  it("throws with expected message", () => {
    const abi: AbiFunction = {
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
      ],
    };
    assert.throws(() => encodeABI(abi, ["0x0", 100]), /not yet implemented/);
  });
});

describe("decodeABI", () => {
  const transferAbi: AbiFunction = {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
  };

  it("decodes ERC-20 transfer(address,uint256)", () => {
    // selector: 0xa9059cbb
    // to: 0x000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045
    // value: 0x0000000000000000000000000000000000000000000000000de0b6b3a7640000 (1 ether)
    const data =
      "0xa9059cbb" +
      "000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045" +
      "0000000000000000000000000000000000000000000000000de0b6b3a7640000";

    const params = decodeABI(transferAbi, data);
    assert.equal(params.length, 2);
    assert.equal(params[0]!.name, "to");
    assert.equal(params[0]!.type, "address");
    assert.equal(params[0]!.value, "0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
    assert.equal(params[1]!.name, "value");
    assert.equal(params[1]!.type, "uint256");
    assert.equal(params[1]!.value, "1000000000000000000");
  });

  it("decodes bool parameter (true)", () => {
    const abi: AbiFunction = {
      name: "setApproval",
      type: "function",
      inputs: [{ name: "approved", type: "bool" }],
    };
    const data = "0x12345678" + "0000000000000000000000000000000000000000000000000000000000000001";

    const params = decodeABI(abi, data);
    assert.equal(params[0]!.value, true);
  });

  it("decodes bool parameter (false)", () => {
    const abi: AbiFunction = {
      name: "setApproval",
      type: "function",
      inputs: [{ name: "approved", type: "bool" }],
    };
    const data = "0x12345678" + "0000000000000000000000000000000000000000000000000000000000000000";

    const params = decodeABI(abi, data);
    assert.equal(params[0]!.value, false);
  });

  it("decodes multiple parameters", () => {
    const abi: AbiFunction = {
      name: "transferFrom",
      type: "function",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
      ],
    };
    const data =
      "0x23b872dd" +
      "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
      "000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" +
      "0000000000000000000000000000000000000000000000000000000000000064";

    const params = decodeABI(abi, data);
    assert.equal(params.length, 3);
    assert.equal(params[0]!.value, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(params[1]!.value, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    assert.equal(params[2]!.value, "100"); // 0x64 = 100
  });

  it("returns raw hex for unknown types", () => {
    const abi: AbiFunction = {
      name: "test",
      type: "function",
      inputs: [{ name: "data", type: "bytes32" }],
    };
    const data = "0x12345678" + "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

    const params = decodeABI(abi, data);
    assert.equal(
      params[0]!.value,
      "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    );
  });

  it("handles int types", () => {
    const abi: AbiFunction = {
      name: "test",
      type: "function",
      inputs: [{ name: "amount", type: "int256" }],
    };
    const data = "0x12345678" + "000000000000000000000000000000000000000000000000000000000000000a";

    const params = decodeABI(abi, data);
    assert.equal(params[0]!.value, "10");
  });

  it("returns empty array for no inputs", () => {
    const abi: AbiFunction = {
      name: "pause",
      type: "function",
      inputs: [],
    };
    const data = "0x8456cb59";

    const params = decodeABI(abi, data);
    assert.equal(params.length, 0);
  });
});
