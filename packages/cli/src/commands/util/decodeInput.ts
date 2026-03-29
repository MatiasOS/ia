import { decodeTxInput } from "@openscan/utils";
import type { CommandDefinition, CommandHandler } from "../../types.js";

const handler: CommandHandler = async (args) => {
  const data = args.data as string;

  if (!data || !data.startsWith("0x")) {
    return {
      exitCode: 1,
      error: { code: "INVALID_INPUT", message: "Data must be a hex string starting with 0x" },
    };
  }

  const decoded = decodeTxInput(data);

  return { exitCode: 0, data: decoded };
};

export const decodeInputCommand: CommandDefinition = {
  name: "util:decode-input",
  description: "Decode transaction input data",
  args: [
    { name: "data", description: "Hex-encoded transaction input data", required: true, type: "string" },
  ],
  flags: [
    { name: "abi", description: "Path to ABI JSON file", type: "string" },
  ],
  handler,
};

export { handler as decodeInputHandler };
