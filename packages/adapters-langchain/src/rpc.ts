import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ALCHEMY_CHAINS: Record<number, string> = {
  1: "eth-mainnet",
  10: "opt-mainnet",
  56: "bnb-mainnet",
  97: "bnb-testnet",
  137: "polygon-mainnet",
  8453: "base-mainnet",
  42161: "arb-mainnet",
  43114: "avax-mainnet",
  11155111: "eth-sepolia",
};

interface RpcEndpoint {
  url: string;
  isPublic: boolean;
}

interface RpcMetadata {
  endpoints: RpcEndpoint[];
}

export function resolveRpcUrls(options: { chainId: number; alchemyKey?: string }): string[] {
  const { chainId, alchemyKey } = options;
  const urls: string[] = [];

  if (alchemyKey) {
    const subdomain = ALCHEMY_CHAINS[chainId];
    if (subdomain) {
      urls.push(`https://${subdomain}.g.alchemy.com/v2/${alchemyKey}`);
    }
  }

  try {
    const require = createRequire(import.meta.url);
    const metadataBase = dirname(require.resolve("@openscan/metadata/package.json"));
    const rpcFile = join(metadataBase, "dist", "rpcs", "evm", `${chainId}.json`);
    const raw = readFileSync(rpcFile, "utf-8");
    const data: RpcMetadata = JSON.parse(raw);
    urls.push(...data.endpoints.filter((e) => e.isPublic).map((e) => e.url));
  } catch {
    // No metadata RPCs for this chain
  }

  if (urls.length === 0) {
    throw new Error(
      `No RPC endpoints available for chain ${chainId}. Provide rpcUrls or alchemyKey.`,
    );
  }

  return urls;
}
