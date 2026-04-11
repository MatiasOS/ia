import { createAgent } from "langchain";
import { ChatGroq } from "@langchain/groq";
import dotenvFlow from 'dotenv-flow';
import {
  getTransactionHistory,
  getGasPriceHistory,
  getAddressType,
  getTokenBalanceHistory,
} from "@openscan/adapters-langchain";

dotenvFlow.config();

const model = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.API_KEY
});

const agent = createAgent({
  model,
  tools: [
    getTransactionHistory,
    getGasPriceHistory,
    getAddressType,
    getTokenBalanceHistory,
  ]
});


const r = await agent.invoke({
    messages: [{ role: "user", content: "Oli! Cómo está Ethereum Mainnet?" }],
  });

const toolsUsed = r.messages
  .filter((m: any) => m.tool_calls?.length > 0)
  .flatMap((m: any) => m.tool_calls.map((tc: any) => tc.name));
const response = r.messages.at(-1)?.content;

console.log("\n--- Tools used ---");
console.log(toolsUsed.join(", "));
console.log("\n--- Response ---");
console.log(response);