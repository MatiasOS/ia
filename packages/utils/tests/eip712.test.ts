import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encodeTypedData, hashTypedData } from "../src/eip712/index.js";
import type { EIP712Domain, EIP712Types } from "../src/types.js";

describe("encodeTypedData", () => {
  const domain: EIP712Domain = {
    name: "MyDApp",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  };

  const types: EIP712Types = {
    Mail: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "contents", type: "string" },
    ],
  };

  const value = {
    from: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    to: "0xDeaDbeefdEAdbEEFdeadbeEFdEAdbEEFdeadbeef",
    contents: "Hello!",
  };

  it("returns a valid JSON string", () => {
    const result = encodeTypedData(domain, types, value);
    assert.doesNotThrow(() => JSON.parse(result));
  });

  it("contains domain, types, and value", () => {
    const result = JSON.parse(encodeTypedData(domain, types, value));
    assert.deepEqual(result.domain, domain);
    assert.deepEqual(result.types, types);
    assert.deepEqual(result.value, value);
  });

  it("handles minimal domain (only name)", () => {
    const minDomain: EIP712Domain = { name: "Simple" };
    const result = JSON.parse(encodeTypedData(minDomain, types, value));
    assert.equal(result.domain.name, "Simple");
    assert.equal(result.domain.version, undefined);
    assert.equal(result.domain.chainId, undefined);
  });

  it("handles full domain with all fields", () => {
    const fullDomain: EIP712Domain = {
      name: "Full",
      version: "2",
      chainId: 137,
      verifyingContract: "0x1234567890123456789012345678901234567890",
      salt: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    };
    const result = JSON.parse(encodeTypedData(fullDomain, types, value));
    assert.deepEqual(result.domain, fullDomain);
  });

  it("handles empty types", () => {
    const emptyTypes: EIP712Types = {};
    const result = JSON.parse(encodeTypedData(domain, emptyTypes, {}));
    assert.deepEqual(result.types, {});
  });

  it("handles empty value", () => {
    const result = JSON.parse(encodeTypedData(domain, types, {}));
    assert.deepEqual(result.value, {});
  });
});

describe("hashTypedData (placeholder)", () => {
  it("throws with expected message", () => {
    assert.throws(
      () =>
        hashTypedData(
          { name: "Test" },
          { Foo: [{ name: "bar", type: "uint256" }] },
          { bar: 42 },
        ),
      /keccak256/,
    );
  });
});
