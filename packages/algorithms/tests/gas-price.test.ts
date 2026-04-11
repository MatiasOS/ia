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
const { GasPriceHistoryAlgorithm } = await import("../src/gas-price/GasPriceHistoryAlgorithm.js");

// --- Helpers ---

function blockHeader(
  blockNumber: number,
  opts?: { baseFee?: string; gasUsed?: number; gasLimit?: number; timestamp?: number },
) {
  const baseFee = opts?.baseFee ?? "0x3b9aca00"; // 1 gwei
  const gasUsed = opts?.gasUsed ?? 15_000_000;
  const gasLimit = opts?.gasLimit ?? 30_000_000;
  const timestamp = opts?.timestamp ?? 1_700_000_000 + blockNumber;
  return {
    number: `0x${blockNumber.toString(16)}`,
    timestamp: `0x${timestamp.toString(16)}`,
    baseFeePerGas: baseFee,
    gasUsed: `0x${gasUsed.toString(16)}`,
    gasLimit: `0x${gasLimit.toString(16)}`,
  };
}

function setupMockRpc(
  currentBlock: number,
  blockHeaders?: Map<number, ReturnType<typeof blockHeader>>,
) {
  mockExecute.mock.mockImplementation(async (method: unknown, params: unknown) => {
    if (method === "eth_blockNumber") {
      return { success: true, data: `0x${currentBlock.toString(16)}` };
    }
    if (method === "eth_getBlockByNumber") {
      const blockHex = (params as string[])[0];
      const blockNum = Number.parseInt(blockHex, 16);
      const header = blockHeaders?.get(blockNum) ?? blockHeader(blockNum);
      return { success: true, data: header };
    }
    return { success: false, errors: [{ error: `Unknown method: ${method}` }] };
  });
}

function defaultParams(overrides?: Record<string, unknown>) {
  return {
    chainId: 1,
    rpcUrls: ["https://rpc.example.com"],
    ...overrides,
  };
}

// --- Tests ---

describe("GasPriceHistoryAlgorithm", () => {
  beforeEach(() => {
    mockExecute.mock.resetCalls();
    mockClose.mock.resetCalls();
  });

  describe("class properties", () => {
    it("has correct name", () => {
      const algo = new GasPriceHistoryAlgorithm();
      assert.equal(algo.name, "gas-price-history");
    });

    it("has supported chains", () => {
      const algo = new GasPriceHistoryAlgorithm();
      assert.ok(algo.supportedChains.includes(1));
      assert.ok(algo.supportedChains.includes(137));
      assert.ok(algo.supportedChains.includes(42161));
    });
  });

  describe("exponential sampling", () => {
    it("samples blocks at exponential offsets from current block", async () => {
      setupMockRpc(1000);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 900 }));

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);

      // current=1000, offsets: 1,2,4,8,16,32,64,128 → blocks: 999,998,996,992,984,968,936,872
      // 872 < 900, so 872 is not included; target 900 is appended
      assert.deepEqual(blockNumbers, [999, 998, 996, 992, 984, 968, 936, 900]);
    });

    it("always includes the target block", async () => {
      setupMockRpc(100);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 90 }));

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);

      // last entry should be the target block
      assert.equal(blockNumbers[blockNumbers.length - 1], 90);
    });

    it("does not duplicate target block if exponential offset lands exactly on it", async () => {
      // current=8, target=0 → offsets: 1,2,4,8 → blocks: 7,6,4,0
      // 0 === target, so no duplicate
      setupMockRpc(8);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 0 }));

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);
      assert.deepEqual(blockNumbers, [7, 6, 4, 0]);
    });

    it("handles single-block range", async () => {
      // current=10, target=9 → offset 1 → block 9 === target
      setupMockRpc(10);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 9 }));

      assert.equal(result.success, true);
      assert.deepEqual(
        result.data!.entries.map((e) => e.blockNumber),
        [9],
      );
    });

    it("handles target equal to current block minus 1", async () => {
      setupMockRpc(500);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 499 }));

      assert.equal(result.success, true);
      assert.deepEqual(
        result.data!.entries.map((e) => e.blockNumber),
        [499],
      );
    });
  });

  describe("target block resolution", () => {
    it("defaults target to currentBlock - 1000", async () => {
      setupMockRpc(5000);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);
      // last entry should be the default target: 5000 - 1000 = 4000
      assert.equal(blockNumbers[blockNumbers.length - 1], 4000);
    });

    it("clamps default target to 0 when current block < 1000", async () => {
      setupMockRpc(500);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);
      assert.equal(blockNumbers[blockNumbers.length - 1], 0);
    });

    it("accepts target block as hex string", async () => {
      setupMockRpc(1000);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: "0x384" })); // 900

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);
      assert.equal(blockNumbers[blockNumbers.length - 1], 900);
    });

    it("accepts target block as number", async () => {
      setupMockRpc(1000);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 950 }));

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);
      assert.equal(blockNumbers[blockNumbers.length - 1], 950);
    });
  });

  describe("block data mapping", () => {
    it("maps block header fields to GasPriceEntry", async () => {
      const headers = new Map([
        [
          99,
          blockHeader(99, {
            baseFee: "0x3b9aca00",
            gasUsed: 15_000_000,
            gasLimit: 30_000_000,
            timestamp: 1_700_000_099,
          }),
        ],
      ]);
      setupMockRpc(100, headers);

      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 99 }));

      assert.equal(result.success, true);
      const entry = result.data!.entries[0];
      assert.equal(entry.blockNumber, 99);
      assert.equal(entry.timestamp, 1_700_000_099);
      assert.equal(entry.baseFee, "0x3b9aca00");
      assert.equal(entry.avgGasPrice, "1"); // 1 gwei
      assert.equal(entry.minGasPrice, "1");
      assert.equal(entry.maxGasPrice, "1");
      assert.equal(entry.gasUsedRatio, 0.5); // 15M / 30M
    });

    it("computes gasUsedRatio from gasUsed and gasLimit", async () => {
      const headers = new Map([
        [99, blockHeader(99, { gasUsed: 9_000_000, gasLimit: 30_000_000 })],
      ]);
      setupMockRpc(100, headers);

      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 99 }));

      assert.equal(result.data!.entries[0].gasUsedRatio, 0.3);
    });

    it("handles gasUsedRatio of 0 when gasLimit is 0", async () => {
      const headers = new Map([[99, blockHeader(99, { gasUsed: 0, gasLimit: 0 })]]);
      setupMockRpc(100, headers);

      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 99 }));

      assert.equal(result.data!.entries[0].gasUsedRatio, 0);
    });

    it("falls back to 0x0 when baseFeePerGas is absent (pre-EIP-1559)", async () => {
      const header = blockHeader(99);
      delete (header as Record<string, unknown>).baseFeePerGas;
      const headers = new Map([[99, header]]);
      setupMockRpc(100, headers as Map<number, ReturnType<typeof blockHeader>>);

      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 99 }));

      assert.equal(result.data!.entries[0].baseFee, "0x0");
      assert.equal(result.data!.entries[0].avgGasPrice, "0");
    });

    it("includes chainId in result data", async () => {
      setupMockRpc(100);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ chainId: 137, targetBlock: 99 }));

      assert.equal(result.data!.chainId, 137);
    });
  });

  describe("error handling", () => {
    it("returns error when eth_blockNumber fails", async () => {
      mockExecute.mock.mockImplementation(async () => ({
        success: false,
        errors: [{ error: "connection refused" }],
      }));

      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, false);
      assert.equal(result.error?.code, "RPC_ERROR");
      assert.equal(result.error?.message, "connection refused");
    });

    it("returns default error message when eth_blockNumber fails without error details", async () => {
      mockExecute.mock.mockImplementation(async () => ({
        success: false,
      }));

      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams());

      assert.equal(result.success, false);
      assert.equal(result.error?.message, "eth_blockNumber failed");
    });

    it("skips blocks where eth_getBlockByNumber fails", async () => {
      const failBlock = 998; // offset 2
      mockExecute.mock.mockImplementation(async (method: unknown, params: unknown) => {
        if (method === "eth_blockNumber") {
          return { success: true, data: "0x3e8" }; // 1000
        }
        if (method === "eth_getBlockByNumber") {
          const blockHex = (params as string[])[0];
          const blockNum = Number.parseInt(blockHex, 16);
          if (blockNum === failBlock) {
            return { success: false, errors: [{ error: "block not found" }] };
          }
          return { success: true, data: blockHeader(blockNum) };
        }
        return { success: false };
      });

      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 990 }));

      assert.equal(result.success, true);
      const blockNumbers = result.data!.entries.map((e) => e.blockNumber);
      assert.ok(!blockNumbers.includes(failBlock), "failed block should be skipped");
      assert.ok(blockNumbers.includes(999), "other blocks should be present");
    });
  });

  describe("metadata", () => {
    it("tracks rpcCalls count correctly", async () => {
      setupMockRpc(100);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 90 }));

      assert.equal(result.success, true);
      const expectedSamples = result.data!.entries.length;
      // 1 eth_blockNumber + N eth_getBlockByNumber calls
      assert.equal(result.metadata?.rpcCalls, 1 + expectedSamples);
    });

    it("includes chainId in metadata", async () => {
      setupMockRpc(100);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ chainId: 42161, targetBlock: 99 }));

      assert.equal(result.metadata?.chainId, 42161);
    });

    it("includes duration and timestamp", async () => {
      setupMockRpc(100);
      const algo = new GasPriceHistoryAlgorithm();
      const before = Date.now();
      const result = await algo.execute(defaultParams({ targetBlock: 99 }));
      const after = Date.now();

      assert.ok(typeof result.metadata?.duration === "number");
      assert.ok(result.metadata!.duration >= 0);
      assert.ok(result.metadata!.timestamp >= before);
      assert.ok(result.metadata!.timestamp <= after);
    });

    it("sets archivalRequired to false", async () => {
      setupMockRpc(100);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 99 }));

      assert.equal(result.metadata?.archivalRequired, false);
    });
  });

  describe("client lifecycle", () => {
    it("always closes the client on success", async () => {
      setupMockRpc(100);
      const algo = new GasPriceHistoryAlgorithm();
      await algo.execute(defaultParams({ targetBlock: 99 }));

      assert.equal(mockClose.mock.callCount(), 1);
    });

    it("always closes the client on error", async () => {
      mockExecute.mock.mockImplementation(async () => ({
        success: false,
        errors: [{ error: "fail" }],
      }));

      const algo = new GasPriceHistoryAlgorithm();
      await algo.execute(defaultParams());

      assert.equal(mockClose.mock.callCount(), 1);
    });
  });

  describe("does not return pagination", () => {
    it("result has no pagination field", async () => {
      setupMockRpc(1000);
      const algo = new GasPriceHistoryAlgorithm();
      const result = await algo.execute(defaultParams({ targetBlock: 900 }));

      assert.equal(result.success, true);
      assert.equal(result.pagination, undefined);
    });
  });
});
