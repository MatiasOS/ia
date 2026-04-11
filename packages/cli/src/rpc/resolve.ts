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
  provider: string;
  isPublic: boolean;
  tracking: string;
}

interface RpcMetadata {
  networkId: string;
  updatedAt: string;
  endpoints: RpcEndpoint[];
}

export interface ResolveRpcOptions {
  chainId: number | string;
  rpcFlag?: string;
  alchemyKey?: string;
}

export function getAlchemyUrl(chainId: number, key: string): string | null {
  const subdomain = ALCHEMY_CHAINS[chainId];
  if (!subdomain) return null;
  return `https://${subdomain}.g.alchemy.com/v2/${key}`;
}

export function resolveRpcUrls(options: ResolveRpcOptions): string[] {
  const { chainId, rpcFlag, alchemyKey } = options;

  if (rpcFlag) {
    return rpcFlag
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
  }

  const urls: string[] = [];
  const numericChainId = typeof chainId === "string" ? Number(chainId) : chainId;

  if (alchemyKey) {
    const alchemyUrl = getAlchemyUrl(numericChainId, alchemyKey);
    if (alchemyUrl) {
      urls.push(alchemyUrl);
    }
  }

  const metadataUrls = loadMetadataRpcs(numericChainId);
  urls.push(...metadataUrls);

  if (urls.length === 0) {
    throw new Error(
      `No RPC endpoints available for chain ${chainId}. ` +
        "Provide --rpc explicitly or use --alchemy-key for supported chains.",
    );
  }

  return urls;
}

function loadMetadataRpcs(chainId: number): string[] {
  try {
    const require = createRequire(import.meta.url);
    const metadataBase = dirname(require.resolve("@openscan/metadata/package.json"));
    const rpcFile = join(metadataBase, "dist", "rpcs", "evm", `${chainId}.json`);
    const raw = readFileSync(rpcFile, "utf-8");
    const data: RpcMetadata = JSON.parse(raw);
    return data.endpoints.filter((e) => e.isPublic).map((e) => e.url);
  } catch {
    return [];
  }
}
