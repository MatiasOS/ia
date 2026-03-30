import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeEventLog } from "../src/events/index.js";
import type { LogEntry } from "../src/events/index.js";
import type { AbiEvent } from "../src/abi/index.js";

// ERC-20 Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
// Topic0 = keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const transferEventAbi: AbiEvent & { selector: string } = {
  name: "Transfer",
  type: "event",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
  selector: TRANSFER_TOPIC,
};

describe("decodeEventLog", () => {
  it("returns null when no ABI provided", () => {
    const log: LogEntry = {
      topics: [TRANSFER_TOPIC],
      data: "0x",
    };
    assert.equal(decodeEventLog(log), null);
  });

  it("returns null for empty ABI array", () => {
    const log: LogEntry = {
      topics: [TRANSFER_TOPIC],
      data: "0x",
    };
    assert.equal(decodeEventLog(log, []), null);
  });

  it("returns null when log has no topics", () => {
    const log: LogEntry = {
      topics: [],
      data: "0x",
    };
    assert.equal(decodeEventLog(log, [transferEventAbi]), null);
  });

  it("returns null for non-matching selector", () => {
    const log: LogEntry = {
      topics: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      data: "0x",
    };
    assert.equal(decodeEventLog(log, [transferEventAbi]), null);
  });

  it("decodes ERC-20 Transfer event", () => {
    const fromAddress = "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const toAddress = "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const log: LogEntry = {
      topics: [TRANSFER_TOPIC, fromAddress, toAddress],
      data: "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
    };

    const result = decodeEventLog(log, [transferEventAbi]);
    assert.notEqual(result, null);
    assert.equal(result!.name, "Transfer");
    assert.equal(result!.signature, "Transfer(address,address,uint256)");
    assert.equal(result!.params.length, 3);

    // from (indexed, from topic)
    assert.equal(result!.params[0]!.name, "from");
    assert.equal(result!.params[0]!.type, "address");
    assert.equal(result!.params[0]!.value, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");

    // to (indexed, from topic)
    assert.equal(result!.params[1]!.name, "to");
    assert.equal(result!.params[1]!.type, "address");
    assert.equal(result!.params[1]!.value, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

    // value (non-indexed, from data)
    assert.equal(result!.params[2]!.name, "value");
    assert.equal(result!.params[2]!.type, "uint256");
    assert.equal(result!.params[2]!.value, "1000000000000000000");
  });

  it("formats event signature correctly", () => {
    const log: LogEntry = {
      topics: [
        TRANSFER_TOPIC,
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ],
      data: "0x0000000000000000000000000000000000000000000000000000000000000000",
    };

    const result = decodeEventLog(log, [transferEventAbi]);
    assert.equal(result!.signature, "Transfer(address,address,uint256)");
  });

  it("decodes indexed bool parameter", () => {
    const boolEventAbi: AbiEvent & { selector: string } = {
      name: "StatusChanged",
      type: "event",
      inputs: [{ name: "active", type: "bool", indexed: true }],
      selector: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    };

    const log: LogEntry = {
      topics: [
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      ],
      data: "0x",
    };

    const result = decodeEventLog(log, [boolEventAbi]);
    assert.notEqual(result, null);
    assert.equal(result!.params[0]!.name, "active");
    assert.equal(result!.params[0]!.value, true);
  });

  it("decodes indexed uint256 parameter", () => {
    const indexedUintAbi: AbiEvent & { selector: string } = {
      name: "ValueSet",
      type: "event",
      inputs: [{ name: "id", type: "uint256", indexed: true }],
      selector: "0x1111111111111111111111111111111111111111111111111111111111111111",
    };

    const log: LogEntry = {
      topics: [
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        "0x0000000000000000000000000000000000000000000000000000000000000064",
      ],
      data: "0x",
    };

    const result = decodeEventLog(log, [indexedUintAbi]);
    assert.notEqual(result, null);
    assert.equal(result!.params[0]!.value, "100");
  });

  it("skips non-event ABI entries", () => {
    const functionAbi: AbiEvent & { selector: string } = {
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
      ],
      selector: TRANSFER_TOPIC,
    };

    const log: LogEntry = {
      topics: [TRANSFER_TOPIC],
      data: "0x",
    };

    assert.equal(decodeEventLog(log, [functionAbi]), null);
  });

  it("decodes non-indexed data params (bool and address)", () => {
    const mixedEventAbi: AbiEvent & { selector: string } = {
      name: "Mixed",
      type: "event",
      inputs: [
        { name: "who", type: "address", indexed: false },
        { name: "flag", type: "bool", indexed: false },
      ],
      selector: "0x2222222222222222222222222222222222222222222222222222222222222222",
    };

    const log: LogEntry = {
      topics: ["0x2222222222222222222222222222222222222222222222222222222222222222"],
      data:
        "0x" +
        "000000000000000000000000cccccccccccccccccccccccccccccccccccccccc" +
        "0000000000000000000000000000000000000000000000000000000000000000",
    };

    const result = decodeEventLog(log, [mixedEventAbi]);
    assert.notEqual(result, null);
    assert.equal(result!.params[0]!.value, "0xcccccccccccccccccccccccccccccccccccccccc");
    assert.equal(result!.params[1]!.value, false);
  });
});
