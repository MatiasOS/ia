import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSignature, formatSignature } from "../src/signatures/index.js";

// A known ECDSA signature for testing
const knownR = "0xd693b532a80fed6392b428604171fb32fdbf953728a3a7ecc7d4062b1652c042";
const knownS = "0x24e9c602ac800b983b035700a14b23f78a253ab762deab5dc27e3555a750b354";
const knownV = 27; // 0x1b
const knownSigHex =
  "0x" +
  "d693b532a80fed6392b428604171fb32fdbf953728a3a7ecc7d4062b1652c042" +
  "24e9c602ac800b983b035700a14b23f78a253ab762deab5dc27e3555a750b354" +
  "1b";

describe("parseSignature", () => {
  it("parses a valid signature with 0x prefix", () => {
    const result = parseSignature(knownSigHex);
    assert.equal(result.r, knownR);
    assert.equal(result.s, knownS);
    assert.equal(result.v, knownV);
  });

  it("parses a valid signature without 0x prefix", () => {
    const result = parseSignature(knownSigHex.slice(2));
    assert.equal(result.r, knownR);
    assert.equal(result.s, knownS);
    assert.equal(result.v, knownV);
  });

  it("parses v=28 (0x1c)", () => {
    const sig =
      "0x" +
      "a".repeat(64) +
      "b".repeat(64) +
      "1c";
    const result = parseSignature(sig);
    assert.equal(result.v, 28);
  });

  it("parses v=0 (0x00)", () => {
    const sig =
      "0x" +
      "a".repeat(64) +
      "b".repeat(64) +
      "00";
    const result = parseSignature(sig);
    assert.equal(result.v, 0);
  });

  it("parses v=1 (0x01)", () => {
    const sig =
      "0x" +
      "a".repeat(64) +
      "b".repeat(64) +
      "01";
    const result = parseSignature(sig);
    assert.equal(result.v, 1);
  });

  it("throws for too short signature", () => {
    assert.throws(
      () => parseSignature("0xdeadbeef"),
      /Invalid signature length/,
    );
  });

  it("throws for too long signature", () => {
    assert.throws(
      () => parseSignature("0x" + "ab".repeat(66)),
      /Invalid signature length/,
    );
  });

  it("throws for empty input", () => {
    assert.throws(
      () => parseSignature(""),
      /Invalid signature length/,
    );
  });

  it("throws for just 0x prefix", () => {
    assert.throws(
      () => parseSignature("0x"),
      /Invalid signature length/,
    );
  });
});

describe("formatSignature", () => {
  it("formats r, s, v into hex signature", () => {
    const result = formatSignature(knownR, knownS, knownV);
    assert.equal(result, knownSigHex);
  });

  it("formats without 0x prefix on r and s", () => {
    const result = formatSignature(knownR.slice(2), knownS.slice(2), knownV);
    assert.equal(result, knownSigHex);
  });

  it("pads short r value", () => {
    const result = formatSignature("0xff", "0x" + "bb".repeat(32), 0);
    // r should be padded to 64 chars
    assert.equal(result.length, 2 + 130); // 0x + 64 + 64 + 2
    assert.ok(result.startsWith("0x00000000000000000000000000000000000000000000000000000000000000ff"));
  });

  it("pads short s value", () => {
    const result = formatSignature("0x" + "aa".repeat(32), "0xff", 0);
    const s = result.slice(2 + 64, 2 + 128);
    assert.equal(s, "00000000000000000000000000000000000000000000000000000000000000ff");
  });

  it("formats v=0", () => {
    const result = formatSignature("0x" + "aa".repeat(32), "0x" + "bb".repeat(32), 0);
    assert.ok(result.endsWith("00"));
  });

  it("formats v=1", () => {
    const result = formatSignature("0x" + "aa".repeat(32), "0x" + "bb".repeat(32), 1);
    assert.ok(result.endsWith("01"));
  });

  it("formats v=27 (0x1b)", () => {
    const result = formatSignature("0x" + "aa".repeat(32), "0x" + "bb".repeat(32), 27);
    assert.ok(result.endsWith("1b"));
  });

  it("formats v=28 (0x1c)", () => {
    const result = formatSignature("0x" + "aa".repeat(32), "0x" + "bb".repeat(32), 28);
    assert.ok(result.endsWith("1c"));
  });
});

describe("parseSignature / formatSignature round-trip", () => {
  it("round-trips a known signature", () => {
    const parsed = parseSignature(knownSigHex);
    const formatted = formatSignature(parsed.r, parsed.s, parsed.v);
    assert.equal(formatted, knownSigHex);
  });

  it("round-trips a v=0 signature", () => {
    const sig = "0x" + "ab".repeat(32) + "cd".repeat(32) + "00";
    const parsed = parseSignature(sig);
    const formatted = formatSignature(parsed.r, parsed.s, parsed.v);
    assert.equal(formatted, sig);
  });

  it("round-trips a v=28 signature", () => {
    const sig = "0x" + "12".repeat(32) + "34".repeat(32) + "1c";
    const parsed = parseSignature(sig);
    const formatted = formatSignature(parsed.r, parsed.s, parsed.v);
    assert.equal(formatted, sig);
  });
});
