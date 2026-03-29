import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeTxInput } from "../src/tx/index.js";
import type { AbiFunction } from "../src/abi/index.js";

describe("decodeTxInput", () => {
  it("returns methodId only when no ABI provided", () => {
    const data =
      "0xa9059cbb" +
      "000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045" +
      "0000000000000000000000000000000000000000000000000de0b6b3a7640000";

    const result = decodeTxInput(data);
    assert.equal(result.methodId, "0xa9059cbb");
    assert.equal(result.methodName, undefined);
    assert.equal(result.params.length, 0);
  });

  it("returns partial methodId for short data", () => {
    const result = decodeTxInput("0xabcd");
    assert.equal(result.methodId, "0xabcd");
    assert.equal(result.params.length, 0);
  });

  it("handles very short data (< 4 bytes)", () => {
    const result = decodeTxInput("0x12");
    assert.equal(result.methodId, "0x12");
    assert.equal(result.params.length, 0);
  });

  it("decodes with matching ABI (pre-computed selector)", () => {
    const transferAbi: AbiFunction & { selector: string } = {
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
      ],
      selector: "0xa9059cbb",
    };

    const data =
      "0xa9059cbb" +
      "000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045" +
      "0000000000000000000000000000000000000000000000000de0b6b3a7640000";

    const result = decodeTxInput(data, [transferAbi]);
    assert.equal(result.methodId, "0xa9059cbb");
    assert.equal(result.methodName, "transfer");
    assert.equal(result.params.length, 2);
    assert.equal(result.params[0]!.name, "to");
    assert.equal(
      result.params[0]!.value,
      "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    );
    assert.equal(result.params[1]!.value, "1000000000000000000");
  });

  it("returns methodId only for non-matching ABI", () => {
    const approveAbi: AbiFunction & { selector: string } = {
      name: "approve",
      type: "function",
      inputs: [
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
      ],
      selector: "0x095ea7b3",
    };

    const data =
      "0xa9059cbb" +
      "000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045" +
      "0000000000000000000000000000000000000000000000000de0b6b3a7640000";

    const result = decodeTxInput(data, [approveAbi]);
    assert.equal(result.methodId, "0xa9059cbb");
    assert.equal(result.methodName, undefined);
    assert.equal(result.params.length, 0);
  });

  it("returns methodId only for empty ABI array", () => {
    const data = "0xa9059cbb" + "00".repeat(64);
    const result = decodeTxInput(data, []);
    assert.equal(result.methodId, "0xa9059cbb");
    assert.equal(result.params.length, 0);
  });

  it("skips non-function ABI entries", () => {
    const eventAbi: AbiFunction & { selector: string } = {
      name: "Transfer",
      type: "event",
      inputs: [
        { name: "from", type: "address", indexed: true },
        { name: "to", type: "address", indexed: true },
        { name: "value", type: "uint256" },
      ],
      selector: "0xa9059cbb",
    };

    const data = "0xa9059cbb" + "00".repeat(64);
    const result = decodeTxInput(data, [eventAbi]);
    assert.equal(result.methodName, undefined);
  });

  it("works without 0x prefix", () => {
    const data =
      "a9059cbb" +
      "000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045" +
      "0000000000000000000000000000000000000000000000000de0b6b3a7640000";

    const result = decodeTxInput(data);
    assert.equal(result.methodId, "0xa9059cbb");
  });
});
