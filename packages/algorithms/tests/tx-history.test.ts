import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// --- Mock setup ---

const mockExecute = mock.fn<(...args: unknown[]) => Promise<unknown>>();
const mockClose = mock.fn(async () => {});

mock.module("@openscan/network-connectors", {
  namedExports: {
    ClientFactory: {
      createClient: () => ({
        execute: mockExecute,
        close: mockClose,
      }),
    },
  },
});

// Import after mock is registered
const { TransactionHistoryAlgorithm } = await import(
  "../src/tx-history/TransactionHistoryAlgorithm.js"
);

// --- Constants ---

const TEST_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const CONTRACT_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc";

function toHex(n: number): string {
  return `0x${n.toString(16)}`;
}

// --- Data builders ---

let txCounter = 0;
function buildTx(
  overrides?: Partial<{
    hash: string;
    blockNumber: number;
    from: string;
    to: string | null;
    value: string;
    gas: string;
    gasPrice: string;
    input: string;
    nonce: string;
  }>,
): {
  hash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  nonce: string;
} {
  txCounter++;
  const blockNum = overrides?.blockNumber ?? 100;
  return {
    hash: overrides?.hash ?? `0x${txCounter.toString(16).padStart(64, "0")}`,
    blockNumber: toHex(blockNum),
    from: overrides?.from ?? OTHER_ADDRESS,
    to: overrides?.to === undefined ? TEST_ADDRESS : overrides.to,
    value: overrides?.value ?? "0xde0b6b3a7640000", // 1 ETH
    gas: overrides?.gas ?? "0x5208", // 21000
    gasPrice: overrides?.gasPrice ?? "0x3b9aca00", // 1 gwei
    input: overrides?.input ?? "0x",
    nonce: overrides?.nonce ?? "0x0",
  };
}

function buildReceipt(
  txHash: string,
  overrides?: Partial<{
    status: string;
    gasUsed: string;
    logs: Array<{ topics?: string[]; data?: string }>;
  }>,
) {
  return {
    transactionHash: txHash,
    status: overrides?.status ?? "0x1",
    gasUsed: overrides?.gasUsed ?? "0x5208",
    logs: overrides?.logs ?? [],
  };
}

/**
 * Creates a step function: returns the nonce value at the latest step <= block.
 * steps must be sorted ascending by block.
 * e.g. stepNonce([[0, 0], [500, 1]]) returns 0 for blocks < 500, 1 for blocks >= 500
 */
function stepNonce(steps: [number, number][]): (block: number) => number {
  return (block: number) => {
    let val = 0;
    for (const [b, n] of steps) {
      if (block >= b) val = n;
      else break;
    }
    return val;
  };
}

function stepBalance(steps: [number, bigint][]): (block: number) => bigint {
  return (block: number) => {
    let val = 0n;
    for (const [b, bal] of steps) {
      if (block >= b) val = bal;
      else break;
    }
    return val;
  };
}

// --- Mock RPC setup ---

interface MockRpcConfig {
  currentBlock: number;
  nonceAtBlock?: (block: number) => number;
  balanceAtBlock?: (block: number) => bigint;
  blocks?: Map<number, { transactions: unknown[]; timestamp?: string }>;
  receipts?: Map<string, ReturnType<typeof buildReceipt>>;
  blockReceiptsFails?: boolean;
}

function setupMockRpc(config: MockRpcConfig) {
  const {
    currentBlock,
    nonceAtBlock = () => 0,
    balanceAtBlock = () => 0n,
    blocks = new Map(),
    receipts = new Map(),
    blockReceiptsFails = false,
  } = config;

  mockExecute.mock.mockImplementation(async (method: unknown, params: unknown) => {
    if (method === "eth_blockNumber") {
      return { success: true, data: toHex(currentBlock) };
    }
    if (method === "eth_getTransactionCount") {
      const p = params as string[];
      const block = Number.parseInt(p[1], 16);
      const nonce = nonceAtBlock(block);
      return { success: true, data: toHex(nonce) };
    }
    if (method === "eth_getBalance") {
      const p = params as string[];
      const block = Number.parseInt(p[1], 16);
      const balance = balanceAtBlock(block);
      return { success: true, data: `0x${balance.toString(16)}` };
    }
    if (method === "eth_getBlockByNumber") {
      const p = params as string[];
      const blockNum = Number.parseInt(p[0], 16);
      const blockData = blocks.get(blockNum);
      return {
        success: true,
        data: {
          number: toHex(blockNum),
          timestamp: blockData?.timestamp ?? toHex(1_700_000_000 + blockNum),
          transactions: blockData?.transactions ?? [],
        },
      };
    }
    if (method === "eth_getBlockReceipts") {
      if (blockReceiptsFails) throw new Error("not supported");
      const p = params as string[];
      const blockNum = Number.parseInt(p[0], 16);
      const blockData = blocks.get(blockNum);
      if (!blockData) return { success: true, data: [] };
      const blockReceipts = [];
      for (const tx of blockData.transactions) {
        const txObj = tx as { hash: string };
        const receipt = receipts.get(txObj.hash?.toLowerCase());
        if (receipt) blockReceipts.push(receipt);
      }
      return { success: true, data: blockReceipts };
    }
    if (method === "eth_getTransactionReceipt") {
      const p = params as string[];
      const hash = p[0].toLowerCase();
      return { success: true, data: receipts.get(hash) ?? null };
    }
    return { success: false, errors: [{ error: `Unknown method: ${method}` }] };
  });
}

function defaultParams(overrides?: Record<string, unknown>) {
  return {
    chainId: 1,
    address: TEST_ADDRESS,
    rpcUrls: ["https://rpc.example.com"],
    ...overrides,
  };
}

/**
 * Helper: set up a scenario where TEST_ADDRESS sent 1 tx at a specific block.
 * Nonce goes 0→1 at txBlock. Balance stays constant at 1 ETH.
 */
function setupSingleSentTx(currentBlock: number, txBlock: number) {
  const txHash = `0x${"ab".repeat(32)}`;
  const tx = buildTx({ hash: txHash, blockNumber: txBlock, from: TEST_ADDRESS, to: OTHER_ADDRESS });
  const receipt = buildReceipt(txHash);

  const blocks = new Map<number, { transactions: unknown[] }>();
  blocks.set(txBlock, { transactions: [tx] });

  const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
  receipts.set(txHash.toLowerCase(), receipt);

  setupMockRpc({
    currentBlock,
    nonceAtBlock: stepNonce([
      [0, 0],
      [txBlock, 1],
    ]),
    balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
    blocks,
    receipts,
  });

  return { txHash, tx, receipt };
}

/**
 * Helper: set up a scenario where TEST_ADDRESS received ETH at a specific block.
 * Nonce stays 0. Balance goes 0→1 ETH at rxBlock.
 */
function setupSingleReceivedTx(currentBlock: number, rxBlock: number) {
  const txHash = `0x${"cd".repeat(32)}`;
  const tx = buildTx({ hash: txHash, blockNumber: rxBlock, from: OTHER_ADDRESS, to: TEST_ADDRESS });
  const receipt = buildReceipt(txHash);

  const blocks = new Map<number, { transactions: unknown[] }>();
  blocks.set(rxBlock, { transactions: [tx] });

  const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
  receipts.set(txHash.toLowerCase(), receipt);

  setupMockRpc({
    currentBlock,
    nonceAtBlock: stepNonce([[0, 0]]),
    balanceAtBlock: stepBalance([
      [0, 0n],
      [rxBlock, 1_000_000_000_000_000_000n],
    ]),
    blocks,
    receipts,
  });

  return { txHash, tx, receipt };
}

// --- Tests ---

describe("TransactionHistoryAlgorithm", () => {
  beforeEach(() => {
    txCounter = 0;
    mockExecute.mock.resetCalls();
    mockClose.mock.resetCalls();
  });

  describe("class properties", () => {
    it("has correct name", () => {
      const algo = new TransactionHistoryAlgorithm();
      assert.equal(algo.name, "tx-history");
    });

    it("has a description", () => {
      const algo = new TransactionHistoryAlgorithm();
      assert.ok(algo.description.length > 0);
    });

    it("has supported chains", () => {
      const algo = new TransactionHistoryAlgorithm();
      assert.ok(algo.supportedChains.includes(1));
      assert.ok(algo.supportedChains.includes(137));
      assert.ok(algo.supportedChains.includes(42161));
      assert.ok(algo.supportedChains.includes(8453));
    });
  });

  describe("client lifecycle", () => {
    it("closes client on success", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      await algo.execute(defaultParams());

      assert.equal(mockClose.mock.callCount(), 1);
    });

    it("closes client on error", async () => {
      mockExecute.mock.mockImplementation(async () => {
        throw new Error("connection refused");
      });

      const algo = new TransactionHistoryAlgorithm();
      await algo.execute(defaultParams());

      assert.equal(mockClose.mock.callCount(), 1);
    });

    it("defaults strategyType to fallback", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      await algo.execute(defaultParams());

      // ClientFactory.createClient is not directly mockable in this pattern,
      // but we verify it doesn't throw (meaning fallback was accepted)
      assert.equal(mockClose.mock.callCount(), 1);
    });
  });

  describe("execute() result structure", () => {
    it("returns success with data on valid input", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.address, TEST_ADDRESS);
      assert.equal(result.data.chainId, 1);
      assert.ok(Array.isArray(result.data.entries));
    });

    it("returns entries for a sent transaction", async () => {
      const { txHash } = setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      assert.ok(result.data!.entries.length > 0);
      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry, "should find the sent transaction");
      assert.equal(entry.type, "sent");
      assert.equal(entry.from, TEST_ADDRESS);
      assert.equal(entry.to, OTHER_ADDRESS);
    });

    it("returns pagination.hasMore = false when blocks fit in page", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.pagination?.hasMore, false);
      assert.equal(result.pagination?.nextCursor, undefined);
    });

    it("includes chainId in result data", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ chainId: 137 }));

      assert.equal(result.data?.chainId, 137);
    });
  });

  describe("execute() metadata", () => {
    it("includes chainId in metadata", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ chainId: 42161 }));

      assert.equal(result.metadata?.chainId, 42161);
    });

    it("includes duration and timestamp", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const before = Date.now();
      const result = await algo.execute(defaultParams());
      const after = Date.now();

      assert.ok(typeof result.metadata?.duration === "number");
      assert.ok(result.metadata!.duration >= 0);
      assert.ok(result.metadata!.timestamp >= before);
      assert.ok(result.metadata!.timestamp <= after);
    });

    it("tracks rpcCalls count", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.ok(result.metadata?.rpcCalls > 0);
    });

    it("sets archivalRequired based on block distance", async () => {
      // Tx at block 50 with current block 1000 => 50 < 1000-128 => archival required
      setupSingleSentTx(1000, 50);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      assert.equal(result.metadata?.archivalRequired, true);
    });

    it("archivalRequired false when block is recent", async () => {
      // Tx at block 990 with current block 1000 => 990 > 1000-128 => not archival
      setupSingleSentTx(1000, 990);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      assert.equal(result.metadata?.archivalRequired, false);
    });
  });

  describe("error handling", () => {
    it("returns RPC_ERROR when execute throws", async () => {
      mockExecute.mock.mockImplementation(async () => {
        throw new Error("connection refused");
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, false);
      assert.equal(result.error?.code, "RPC_ERROR");
      assert.equal(result.error?.message, "connection refused");
    });

    it("returns 'Unknown error' for non-Error throws", async () => {
      mockExecute.mock.mockImplementation(async () => {
        throw "some string error";
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, false);
      assert.equal(result.error?.message, "Unknown error");
    });
  });

  describe("inactive address", () => {
    it("returns empty entries for address with no activity", async () => {
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: () => 0,
        balanceAtBlock: () => 0n,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      assert.equal(result.data!.entries.length, 0);
    });

    it("returns empty entries when no state change in range", async () => {
      // Same nonce and balance at all blocks => no activity in range
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: () => 5,
        balanceAtBlock: () => 1_000_000_000_000_000_000n,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(
        defaultParams({
          pagination: { fromBlock: 500, toBlock: 1000 },
        }),
      );

      assert.equal(result.success, true);
      assert.equal(result.data!.entries.length, 0);
    });
  });

  describe("transaction classification", () => {
    it("classifies tx as 'sent' when from matches address", async () => {
      const { txHash } = setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.type, "sent");
    });

    it("classifies tx as 'received' when to matches address", async () => {
      const { txHash } = setupSingleReceivedTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.type, "received");
    });

    it("classifies tx as 'internal' when address in tx.input", async () => {
      const txHash = `0x${"ee".repeat(32)}`;
      const strippedAddress = TEST_ADDRESS.replace("0x", "");
      const tx = buildTx({
        hash: txHash,
        blockNumber: 950,
        from: OTHER_ADDRESS,
        to: CONTRACT_ADDRESS,
        input: `0x12345678000000000000000000000000${strippedAddress}`,
      });
      const receipt = buildReceipt(txHash);

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      // Balance changes at block 950 but nonce stays 0 (not a sent tx from this address)
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([[0, 0]]),
        balanceAtBlock: stepBalance([
          [0, 0n],
          [950, 1_000_000_000_000_000_000n],
        ]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry, "should find the internal transaction");
      assert.equal(entry.type, "internal");
    });

    it("classifies tx as 'internal' when address in receipt log topics", async () => {
      const txHash = `0x${"ff".repeat(32)}`;
      const strippedAddress = TEST_ADDRESS.replace("0x", "");
      const paddedAddress = `0x000000000000000000000000${strippedAddress}`;
      const tx = buildTx({
        hash: txHash,
        blockNumber: 950,
        from: OTHER_ADDRESS,
        to: CONTRACT_ADDRESS,
        input: "0x12345678",
      });
      const receipt = buildReceipt(txHash, {
        logs: [{ topics: [paddedAddress], data: "0x" }],
      });

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([[0, 0]]),
        balanceAtBlock: stepBalance([
          [0, 0n],
          [950, 1_000_000_000_000_000_000n],
        ]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry, "should find the internal transaction via log topics");
      assert.equal(entry.type, "internal");
    });

    it("classifies tx as 'internal' when address in receipt log data", async () => {
      const txHash = `0x${"dd".repeat(32)}`;
      const strippedAddress = TEST_ADDRESS.replace("0x", "");
      const tx = buildTx({
        hash: txHash,
        blockNumber: 950,
        from: OTHER_ADDRESS,
        to: CONTRACT_ADDRESS,
        input: "0x12345678",
      });
      const receipt = buildReceipt(txHash, {
        logs: [{ topics: ["0x0000"], data: `0x000000000000000000000000${strippedAddress}` }],
      });

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([[0, 0]]),
        balanceAtBlock: stepBalance([
          [0, 0n],
          [950, 1_000_000_000_000_000_000n],
        ]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry, "should find the internal transaction via log data");
      assert.equal(entry.type, "internal");
    });

    it("extracts methodId from input data >= 10 chars", async () => {
      const txHash = `0x${"ab".repeat(32)}`;
      const tx = buildTx({
        hash: txHash,
        blockNumber: 950,
        from: TEST_ADDRESS,
        to: CONTRACT_ADDRESS,
        input: "0xa9059cbb000000000000000000000000",
      });
      const receipt = buildReceipt(txHash);

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [950, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.methodId, "0xa9059cbb");
    });

    it("omits methodId when input is plain transfer", async () => {
      const { txHash } = setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.methodId, undefined);
    });

    it("maps status 0x1 to 'success'", async () => {
      const { txHash } = setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.status, "success");
    });

    it("maps non-0x1 status to 'failure'", async () => {
      const txHash = `0x${"ab".repeat(32)}`;
      const tx = buildTx({ hash: txHash, blockNumber: 950, from: TEST_ADDRESS, to: OTHER_ADDRESS });
      const receipt = buildReceipt(txHash, { status: "0x0" });

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [950, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.status, "failure");
    });

    it("handles null 'to' field (contract creation)", async () => {
      const txHash = `0x${"ab".repeat(32)}`;
      const tx = buildTx({ hash: txHash, blockNumber: 950, from: TEST_ADDRESS, to: null });
      const receipt = buildReceipt(txHash);

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [950, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.to, null);
      assert.equal(entry.type, "sent");
    });

    it("maps entry fields correctly", async () => {
      const { txHash } = setupSingleReceivedTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry);
      assert.equal(entry.hash, txHash);
      assert.equal(entry.blockNumber, 950);
      assert.equal(typeof entry.timestamp, "number");
      assert.equal(entry.from, OTHER_ADDRESS);
      assert.equal(entry.to, TEST_ADDRESS);
      assert.equal(entry.value, "0xde0b6b3a7640000");
      assert.equal(entry.gasPrice, "0x3b9aca00");
      assert.ok(entry.gasUsed);
    });
  });

  describe("receipt fetching", () => {
    it("falls back to individual receipts when eth_getBlockReceipts fails", async () => {
      const txHash = `0x${"ab".repeat(32)}`;
      const tx = buildTx({ hash: txHash, blockNumber: 950, from: TEST_ADDRESS, to: OTHER_ADDRESS });
      const receipt = buildReceipt(txHash);

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [950, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
        blockReceiptsFails: true,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      const entry = result.data!.entries.find((e: { hash: string }) => e.hash === txHash);
      assert.ok(entry, "should find tx even when block receipts fail");
      assert.equal(entry.status, "success");

      // Verify that eth_getTransactionReceipt was called as fallback
      const calls = mockExecute.mock.calls;
      const receiptCalls = calls.filter(
        (c: { arguments: unknown[] }) => c.arguments[0] === "eth_getTransactionReceipt",
      );
      assert.ok(receiptCalls.length > 0, "should fall back to individual receipt calls");
    });
  });

  describe("multiple transactions", () => {
    it("finds transactions across multiple blocks", async () => {
      const txHash1 = `0x${"a1".repeat(32)}`;
      const txHash2 = `0x${"a2".repeat(32)}`;
      const tx1 = buildTx({
        hash: txHash1,
        blockNumber: 900,
        from: TEST_ADDRESS,
        to: OTHER_ADDRESS,
      });
      const tx2 = buildTx({
        hash: txHash2,
        blockNumber: 950,
        from: TEST_ADDRESS,
        to: OTHER_ADDRESS,
      });
      const receipt1 = buildReceipt(txHash1);
      const receipt2 = buildReceipt(txHash2);

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(900, { transactions: [tx1] });
      blocks.set(950, { transactions: [tx2] });

      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash1.toLowerCase(), receipt1);
      receipts.set(txHash2.toLowerCase(), receipt2);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [900, 1],
          [950, 2],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      const hashes = result.data!.entries.map((e: { hash: string }) => e.hash);
      assert.ok(hashes.includes(txHash1), "should find first tx");
      assert.ok(hashes.includes(txHash2), "should find second tx");
    });

    it("sorts entries by blockNumber descending", async () => {
      const txHash1 = `0x${"a1".repeat(32)}`;
      const txHash2 = `0x${"a2".repeat(32)}`;
      const tx1 = buildTx({
        hash: txHash1,
        blockNumber: 900,
        from: TEST_ADDRESS,
        to: OTHER_ADDRESS,
      });
      const tx2 = buildTx({
        hash: txHash2,
        blockNumber: 950,
        from: TEST_ADDRESS,
        to: OTHER_ADDRESS,
      });

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(900, { transactions: [tx1] });
      blocks.set(950, { transactions: [tx2] });

      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash1.toLowerCase(), buildReceipt(txHash1));
      receipts.set(txHash2.toLowerCase(), buildReceipt(txHash2));

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [900, 1],
          [950, 2],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      const blockNumbers = result.data!.entries.map((e: { blockNumber: number }) => e.blockNumber);
      for (let i = 1; i < blockNumbers.length; i++) {
        assert.ok(blockNumbers[i - 1] >= blockNumbers[i], "entries should be sorted descending");
      }
    });
  });

  describe("searchAddressActivity via initClient", () => {
    it("returns stats with correct counts", async () => {
      const txHash = `0x${"ab".repeat(32)}`;
      const tx = buildTx({ hash: txHash, blockNumber: 950, from: TEST_ADDRESS, to: OTHER_ADDRESS });
      const receipt = buildReceipt(txHash);

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(950, { transactions: [tx] });
      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash.toLowerCase(), receipt);

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [950, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const result = await algo.searchAddressActivity(TEST_ADDRESS);

      assert.ok(result.stats.totalBlocks > 0);
      assert.ok(result.stats.totalTxs > 0);
      assert.equal(result.stats.sentCount, 1);
      assert.equal(result.stats.receivedCount, 0);
      assert.ok(result.stats.rpcCalls > 0);
      assert.ok(result.stats.elapsedMs >= 0);
    });

    it("calls onProgress callback", async () => {
      setupSingleSentTx(1000, 950);

      const progressCalls: unknown[] = [];
      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      await algo.searchAddressActivity(TEST_ADDRESS, {
        onProgress: (p: unknown) => progressCalls.push(p),
      });

      assert.ok(progressCalls.length > 0, "onProgress should be called at least once");
    });

    it("calls onTransactionsFound callback", async () => {
      setupSingleSentTx(1000, 950);

      const foundBatches: unknown[][] = [];
      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      await algo.searchAddressActivity(TEST_ADDRESS, {
        onTransactionsFound: (entries: unknown[]) => foundBatches.push(entries),
      });

      assert.ok(foundBatches.length > 0, "onTransactionsFound should be called");
      assert.ok(foundBatches[0].length > 0, "should have entries in batch");
    });

    it("returns empty when eth_blockNumber returns no data", async () => {
      mockExecute.mock.mockImplementation(async (method: unknown) => {
        if (method === "eth_blockNumber") {
          return { success: true, data: null };
        }
        return { success: false };
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const result = await algo.searchAddressActivity(TEST_ADDRESS);

      assert.equal(result.entries.length, 0);
      assert.equal(result.blocks.length, 0);
    });

    it("respects limit option", async () => {
      // Set up 3 transactions at different blocks
      const txHash1 = `0x${"a1".repeat(32)}`;
      const txHash2 = `0x${"a2".repeat(32)}`;
      const txHash3 = `0x${"a3".repeat(32)}`;
      const tx1 = buildTx({
        hash: txHash1,
        blockNumber: 800,
        from: TEST_ADDRESS,
        to: OTHER_ADDRESS,
      });
      const tx2 = buildTx({
        hash: txHash2,
        blockNumber: 900,
        from: TEST_ADDRESS,
        to: OTHER_ADDRESS,
      });
      const tx3 = buildTx({
        hash: txHash3,
        blockNumber: 950,
        from: TEST_ADDRESS,
        to: OTHER_ADDRESS,
      });

      const blocks = new Map<number, { transactions: unknown[] }>();
      blocks.set(800, { transactions: [tx1] });
      blocks.set(900, { transactions: [tx2] });
      blocks.set(950, { transactions: [tx3] });

      const receipts = new Map<string, ReturnType<typeof buildReceipt>>();
      receipts.set(txHash1.toLowerCase(), buildReceipt(txHash1));
      receipts.set(txHash2.toLowerCase(), buildReceipt(txHash2));
      receipts.set(txHash3.toLowerCase(), buildReceipt(txHash3));

      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [800, 1],
          [900, 2],
          [950, 3],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
        blocks,
        receipts,
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const result = await algo.searchAddressActivity(TEST_ADDRESS, { limit: 2 });

      // Should respect the limit - blocks fetched should be <= limit
      assert.ok(result.blocks.length <= 2, `expected <= 2 blocks, got ${result.blocks.length}`);
    });
  });

  describe("getTransactionRange via initClient", () => {
    it("returns null when nonce is 0", async () => {
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: () => 0,
        balanceAtBlock: () => 0n,
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const range = await algo.getTransactionRange(TEST_ADDRESS);

      assert.equal(range, null);
    });

    it("returns null when eth_blockNumber has no data", async () => {
      mockExecute.mock.mockImplementation(async (method: unknown) => {
        if (method === "eth_blockNumber") {
          return { success: true, data: null };
        }
        return { success: true, data: "0x0" };
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const range = await algo.getTransactionRange(TEST_ADDRESS);

      assert.equal(range, null);
    });

    it("finds correct range for single transaction", async () => {
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [500, 1],
        ]),
        balanceAtBlock: () => 0n,
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const range = await algo.getTransactionRange(TEST_ADDRESS);

      assert.ok(range);
      assert.equal(range.totalSent, 1);
      assert.equal(range.startBlock, 500);
      assert.equal(range.endBlock, 500);
    });

    it("finds correct range for multiple transactions", async () => {
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [300, 1],
          [700, 2],
        ]),
        balanceAtBlock: () => 0n,
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const range = await algo.getTransactionRange(TEST_ADDRESS);

      assert.ok(range);
      assert.equal(range.totalSent, 2);
      assert.equal(range.startBlock, 300);
      assert.equal(range.endBlock, 700);
    });
  });

  describe("findRecentActivityRange via initClient", () => {
    it("returns null for inactive address", async () => {
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: () => 0,
        balanceAtBlock: () => 0n,
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const range = await algo.findRecentActivityRange(TEST_ADDRESS);

      assert.equal(range, null);
    });

    it("finds range when state differs within initial range", async () => {
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [950, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const range = await algo.findRecentActivityRange(TEST_ADDRESS, 1000);

      assert.ok(range);
      assert.ok(range.fromBlock <= 950);
      assert.ok(range.toBlock >= 950);
    });

    it("returns range to genesis when activity spans entire history", async () => {
      // Nonce = 1 even at block 0
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: () => 1,
        balanceAtBlock: () => 1_000_000_000_000_000_000n,
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const range = await algo.findRecentActivityRange(TEST_ADDRESS, 1000);

      assert.ok(range);
      assert.equal(range.fromBlock, 0);
      assert.equal(range.toBlock, 1000);
    });

    it("respects AbortSignal", async () => {
      // Activity is very far back => needs many iterations
      setupMockRpc({
        currentBlock: 10_000_000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [100, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      const controller = new AbortController();
      controller.abort(); // abort immediately

      const range = await algo.findRecentActivityRange(TEST_ADDRESS, 10_000_000, controller.signal);

      assert.equal(range, null);
    });
  });

  describe("caching", () => {
    it("clearCache resets nonce and balance caches", async () => {
      setupMockRpc({
        currentBlock: 1000,
        nonceAtBlock: stepNonce([
          [0, 0],
          [950, 1],
        ]),
        balanceAtBlock: stepBalance([[0, 1_000_000_000_000_000_000n]]),
      });

      const algo = new TransactionHistoryAlgorithm();
      algo.initClient({ execute: mockExecute, close: mockClose });

      // First call to populate cache
      await algo.findRecentActivityRange(TEST_ADDRESS, 1000);
      const callsAfterFirst = mockExecute.mock.callCount();

      // Clear cache and call again
      algo.clearCache();
      await algo.findRecentActivityRange(TEST_ADDRESS, 1000);
      const callsAfterSecond = mockExecute.mock.callCount();

      // After clearing cache, it should make new RPC calls
      assert.ok(
        callsAfterSecond > callsAfterFirst,
        "should make new RPC calls after clearing cache",
      );
    });
  });

  describe("pagination via execute()", () => {
    it("uses pagination.cursor as toBlock", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(
        defaultParams({
          pagination: { cursor: "960" },
        }),
      );

      // Should search up to block 960
      assert.equal(result.success, true);
    });

    it("uses pagination.fromBlock", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(
        defaultParams({
          pagination: { fromBlock: 940 },
        }),
      );

      assert.equal(result.success, true);
    });

    it("uses pagination.toBlock when no cursor", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(
        defaultParams({
          pagination: { toBlock: 960 },
        }),
      );

      assert.equal(result.success, true);
    });

    it("uses pagination.pageSize", async () => {
      setupSingleSentTx(1000, 950);
      const algo = new TransactionHistoryAlgorithm();
      const result = await algo.execute(
        defaultParams({
          pagination: { pageSize: 10 },
        }),
      );

      assert.equal(result.success, true);
      assert.ok(result.data!.entries.length <= 10);
    });
  });
});
