import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatUnits,
  parseUnits,
  weiToEther,
  etherToWei,
  weiToGwei,
  gweiToWei,
} from "../src/units/index.js";

describe("formatUnits", () => {
  it("formats 1 ether", () => {
    assert.equal(formatUnits(1000000000000000000n, 18), "1");
  });

  it("formats zero", () => {
    assert.equal(formatUnits(0n, 18), "0");
  });

  it("formats 0.5 ether", () => {
    assert.equal(formatUnits(500000000000000000n, 18), "0.5");
  });

  it("formats small value with leading decimal zeros (viem)", () => {
    assert.equal(formatUnits(69n, 5), "0.00069");
  });

  it("removes trailing zeros (viem)", () => {
    assert.equal(formatUnits(10000000000000n, 18), "0.00001");
  });

  it("formats large number preserving precision (viem)", () => {
    assert.equal(formatUnits(6942069420123456789123450000n, 18), "6942069420.12345678912345");
  });

  it("omits decimal point when clean (viem)", () => {
    assert.equal(formatUnits(1300000n, 5), "13");
  });

  it("formats negative value", () => {
    assert.equal(formatUnits(-1000000000000000000n, 18), "-1");
  });

  it("formats negative fractional value", () => {
    assert.equal(formatUnits(-500000000000000000n, 18), "-0.5");
  });

  it("formats 1 wei in ether", () => {
    assert.equal(formatUnits(1n, 18), "0.000000000000000001");
  });

  it("formats with decimals=0", () => {
    assert.equal(formatUnits(123n, 0), "123");
  });

  it("accepts string input", () => {
    assert.equal(formatUnits("1000000000000000000", 18), "1");
  });

  it("formats 20 gwei from wei", () => {
    assert.equal(formatUnits(20000000000n, 9), "20");
  });

  it("formats 100 ether", () => {
    assert.equal(formatUnits(100000000000000000000n, 18), "100");
  });
});

describe("parseUnits", () => {
  it("parses 1 ether", () => {
    assert.equal(parseUnits("1", 18), 1000000000000000000n);
  });

  it("parses zero", () => {
    assert.equal(parseUnits("0", 18), 0n);
  });

  it("parses 1.5 ether", () => {
    assert.equal(parseUnits("1.5", 18), 1500000000000000000n);
  });

  it("parses 1 wei (smallest unit)", () => {
    assert.equal(parseUnits("0.000000000000000001", 18), 1n);
  });

  it("parses 100 ether", () => {
    assert.equal(parseUnits("100", 18), 100000000000000000000n);
  });

  it("parses integer without decimal", () => {
    assert.equal(parseUnits("42", 18), 42000000000000000000n);
  });

  it("truncates excess precision (viem)", () => {
    assert.equal(parseUnits("1.123456789012345678999", 18), 1123456789012345678n);
  });

  it("parses 0.1 with 1 decimal", () => {
    assert.equal(parseUnits("0.1", 1), 1n);
  });

  it("parses with decimals=0", () => {
    assert.equal(parseUnits("123", 0), 123n);
  });

  it("parses small gwei value", () => {
    assert.equal(parseUnits("1.5", 9), 1500000000n);
  });
});

describe("weiToEther", () => {
  it("converts 1 ether in wei", () => {
    assert.equal(weiToEther(1000000000000000000n), "1");
  });

  it("converts zero", () => {
    assert.equal(weiToEther(0n), "0");
  });

  it("converts 1 wei", () => {
    assert.equal(weiToEther(1n), "0.000000000000000001");
  });

  it("accepts string input", () => {
    assert.equal(weiToEther("1000000000000000000"), "1");
  });
});

describe("etherToWei", () => {
  it("converts 1 ether", () => {
    assert.equal(etherToWei("1"), 1000000000000000000n);
  });

  it("converts 0.5 ether", () => {
    assert.equal(etherToWei("0.5"), 500000000000000000n);
  });

  it("converts zero", () => {
    assert.equal(etherToWei("0"), 0n);
  });
});

describe("weiToEther / etherToWei round-trip", () => {
  it("round-trips 1.23 ether", () => {
    assert.equal(weiToEther(etherToWei("1.23")), "1.23");
  });

  it("round-trips 0.000000000000000001", () => {
    assert.equal(weiToEther(etherToWei("0.000000000000000001")), "0.000000000000000001");
  });

  it("round-trips large value", () => {
    assert.equal(weiToEther(etherToWei("12345.6789")), "12345.6789");
  });
});

describe("weiToGwei", () => {
  it("converts 1 gwei in wei", () => {
    assert.equal(weiToGwei(1000000000n), "1");
  });

  it("converts zero", () => {
    assert.equal(weiToGwei(0n), "0");
  });
});

describe("gweiToWei", () => {
  it("converts 1 gwei", () => {
    assert.equal(gweiToWei("1"), 1000000000n);
  });

  it("converts 20 gwei", () => {
    assert.equal(gweiToWei("20"), 20000000000n);
  });
});

describe("weiToGwei / gweiToWei round-trip", () => {
  it("round-trips 5.5 gwei", () => {
    assert.equal(weiToGwei(gweiToWei("5.5")), "5.5");
  });

  it("round-trips 100 gwei", () => {
    assert.equal(weiToGwei(gweiToWei("100")), "100");
  });
});
