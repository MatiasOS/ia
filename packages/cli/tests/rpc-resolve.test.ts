import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRpcUrls, getAlchemyUrl } from "../src/rpc/resolve.js";

describe("getAlchemyUrl", () => {
  it("returns correct URL for Ethereum mainnet", () => {
    const url = getAlchemyUrl(1, "test-key");
    assert.equal(url, "https://eth-mainnet.g.alchemy.com/v2/test-key");
  });

  it("returns correct URL for Polygon", () => {
    const url = getAlchemyUrl(137, "my-key");
    assert.equal(url, "https://polygon-mainnet.g.alchemy.com/v2/my-key");
  });

  it("returns correct URL for Base", () => {
    const url = getAlchemyUrl(8453, "key");
    assert.equal(url, "https://base-mainnet.g.alchemy.com/v2/key");
  });

  it("returns correct URL for Arbitrum", () => {
    const url = getAlchemyUrl(42161, "key");
    assert.equal(url, "https://arb-mainnet.g.alchemy.com/v2/key");
  });

  it("returns correct URL for Optimism", () => {
    const url = getAlchemyUrl(10, "key");
    assert.equal(url, "https://opt-mainnet.g.alchemy.com/v2/key");
  });

  it("returns correct URL for Sepolia", () => {
    const url = getAlchemyUrl(11155111, "key");
    assert.equal(url, "https://eth-sepolia.g.alchemy.com/v2/key");
  });

  it("returns null for unsupported chain", () => {
    const url = getAlchemyUrl(31337, "key");
    assert.equal(url, null);
  });
});

describe("resolveRpcUrls", () => {
  it("returns explicit RPC URLs when rpcFlag is provided", () => {
    const urls = resolveRpcUrls({
      chainId: 1,
      rpcFlag: "https://rpc1.example.com,https://rpc2.example.com",
    });
    assert.deepEqual(urls, ["https://rpc1.example.com", "https://rpc2.example.com"]);
  });

  it("trims whitespace from rpcFlag URLs", () => {
    const urls = resolveRpcUrls({
      chainId: 1,
      rpcFlag: " https://rpc1.example.com , https://rpc2.example.com ",
    });
    assert.deepEqual(urls, ["https://rpc1.example.com", "https://rpc2.example.com"]);
  });

  it("ignores alchemyKey when rpcFlag is provided", () => {
    const urls = resolveRpcUrls({
      chainId: 1,
      rpcFlag: "https://rpc1.example.com",
      alchemyKey: "test-key",
    });
    assert.deepEqual(urls, ["https://rpc1.example.com"]);
  });

  it("loads metadata RPCs when no flags provided", () => {
    const urls = resolveRpcUrls({ chainId: 1 });
    assert.ok(urls.length > 0, "Should have loaded public RPCs from metadata");
    for (const url of urls) {
      assert.ok(url.startsWith("https://"), `URL should start with https://: ${url}`);
    }
  });

  it("prepends Alchemy URL when alchemyKey is provided", () => {
    const urls = resolveRpcUrls({ chainId: 1, alchemyKey: "test-key" });
    assert.ok(urls.length > 1, "Should have Alchemy URL + metadata RPCs");
    assert.equal(urls[0], "https://eth-mainnet.g.alchemy.com/v2/test-key");
  });

  it("loads metadata RPCs for other supported chains", () => {
    const urls = resolveRpcUrls({ chainId: 137 });
    assert.ok(urls.length > 0, "Should have loaded Polygon RPCs from metadata");
  });

  it("throws for unsupported chain with no explicit RPCs", () => {
    assert.throws(() => resolveRpcUrls({ chainId: 31337 }), {
      message: /No RPC endpoints available for chain 31337/,
    });
  });

  it("accepts string chainId", () => {
    const urls = resolveRpcUrls({ chainId: "1" });
    assert.ok(urls.length > 0, "Should resolve with string chainId");
  });
});
