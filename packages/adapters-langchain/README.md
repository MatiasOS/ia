# @openscan/adapters-langchain

LangChain tool wrappers for on-chain blockchain analysis. Exposes [OpenScan](https://github.com/aspect-build/openscan) algorithms and utilities as structured LangChain tools that any LLM agent can call.

Each tool wraps `@openscan/algorithms` or `@openscan/utils` **directly** — no CLI layer in between. Tools accept typed inputs (validated with Zod), call on-chain RPC endpoints, and return JSON strings ready for LLM consumption.

## Installation

```bash
pnpm add @openscan/adapters-langchain @openscan/network-connectors
```

Peer dependencies (install if not already present):

```bash
pnpm add @langchain/core zod
```

## Quick Start

Bind all tools to a LangChain agent:

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  getTransactionHistory,
  getGasPriceHistory,
  getAddressType,
  getTokenBalanceHistory,
} from "@openscan/adapters-langchain";

const tools = [
  getTransactionHistory,
  getGasPriceHistory,
  getAddressType,
  getTokenBalanceHistory,
];

const llm = new ChatOpenAI({ model: "gpt-4o" });

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a blockchain analyst. Use the provided tools to answer questions about on-chain data."],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

const agent = createToolCallingAgent({ llm, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({
  input: "What type of address is 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum?",
});

console.log(result.output);
```

## Available Tools

| Export | LangChain Tool Name | Description |
|--------|-------------------|-------------|
| `getTransactionHistory` | `get_transaction_history` | Get on-chain transaction history by scanning Transfer event logs |
| `getGasPriceHistory` | `get_gas_price_history` | Get gas price history by sampling blocks exponentially |
| `getAddressType` | `detect_address_type` | Detect whether an address is an EOA, contract, or proxy |
| `getTokenBalanceHistory` | `get_token_balance_history` | Track ERC-20 token balance changes via Transfer event logs |

## RPC Resolution

All tools accept optional `rpcUrls` and `alchemyKey` inputs. When neither is provided, RPC endpoints are **auto-resolved** from `@openscan/metadata`:

```
Priority:
1. Alchemy premium endpoint (if alchemyKey provided)
2. Public endpoints from @openscan/metadata
3. Error if no endpoints found
```

To use Alchemy premium RPCs, pass `alchemyKey` or set the `ALCHEMY_API_KEY` environment variable at the application level.

### Supported Alchemy Chains

| Chain ID | Network |
|----------|---------|
| 1 | Ethereum Mainnet |
| 10 | Optimism |
| 56 | BNB Chain |
| 97 | BNB Testnet |
| 137 | Polygon |
| 8453 | Base |
| 42161 | Arbitrum |
| 43114 | Avalanche |
| 11155111 | Sepolia Testnet |

Public RPC auto-resolution (without Alchemy) works for any chain present in `@openscan/metadata`.

## Tool Usage Examples

### Transaction History

```typescript
import { getTransactionHistory } from "@openscan/adapters-langchain";

const result = await getTransactionHistory.invoke({
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  chainId: 1,
  pageSize: 25,
});

console.log(result); // JSON string of transaction history
```

### Gas Price History

```typescript
import { getGasPriceHistory } from "@openscan/adapters-langchain";

const result = await getGasPriceHistory.invoke({
  chainId: 137,
  targetBlock: 50000000,
});

console.log(result); // JSON string of gas price samples
```

### Address Type Detection

```typescript
import { getAddressType } from "@openscan/adapters-langchain";

const result = await getAddressType.invoke({
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  chainId: 1,
});

console.log(result); // e.g. { "type": "contract", "isProxy": true, ... }
```

### Token Balance History

```typescript
import { getTokenBalanceHistory } from "@openscan/adapters-langchain";

const result = await getTokenBalanceHistory.invoke({
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  chainId: 1,
});

console.log(result); // JSON string of balance changes over time
```

### Using with Alchemy

Pass `alchemyKey` to any tool for premium RPC access:

```typescript
const result = await getTransactionHistory.invoke({
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  chainId: 1,
  alchemyKey: "your-alchemy-api-key",
});
```

### Using with Custom RPC URLs

```typescript
const result = await getGasPriceHistory.invoke({
  chainId: 1,
  rpcUrls: ["https://my-private-rpc.example.com"],
});
```

## Input Schemas

### Common Fields (all tools)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chainId` | `number` | Yes | EVM chain ID (1 = Ethereum, 137 = Polygon, etc.) |
| `rpcUrls` | `string[]` | No | RPC endpoint URLs; auto-resolved from metadata if omitted |
| `alchemyKey` | `string` | No | Alchemy API key for premium RPC access |

### Tool-Specific Fields

| Tool | Field | Type | Required | Description |
|------|-------|------|----------|-------------|
| `getTransactionHistory` | `address` | `string` | Yes | Blockchain address to look up |
| `getTransactionHistory` | `pageSize` | `number` | No | Max results per page (default: 50) |
| `getGasPriceHistory` | `targetBlock` | `number` | No | Block to sample back to (~1000 blocks default) |
| `getAddressType` | `address` | `string` | Yes | Address to classify |
| `getTokenBalanceHistory` | `address` | `string` | Yes | Holder address to track |
| `getTokenBalanceHistory` | `tokenAddress` | `string` | Yes | ERC-20 token contract address |

## Architecture

```
Your LangChain Agent
  └─ @openscan/adapters-langchain (this package)
       ├─ @openscan/algorithms    ← direct algorithm execution
       ├─ @openscan/utils         ← address validation, type detection
       ├─ @openscan/metadata      ← auto-resolve public RPC endpoints
       └─ @openscan/network-connectors  ← RPC client creation (peer dep)
```

All data is fetched from on-chain RPC calls. No indexing APIs or centralized services are used.

## License

MIT
