import type { AbiEvent, AbiInput } from "../abi/index.js";
import type { DecodedEvent, DecodedParam } from "../types.js";

export interface LogEntry {
  topics: string[];
  data: string;
}

/**
 * Decode an event log entry using an ABI event definition.
 */
export function decodeEventLog(log: LogEntry, abi?: AbiEvent[]): DecodedEvent | null {
  if (!abi || abi.length === 0 || log.topics.length === 0) {
    return null;
  }

  const eventTopic = log.topics[0];
  if (!eventTopic) return null;

  // Find matching event by topic[0] (event signature hash)
  // In production, compute keccak256 of event signatures for matching
  // For now, match by pre-computed selector
  for (const evt of abi) {
    if (evt.type !== "event") continue;
    // biome-ignore lint/suspicious/noExplicitAny: selector may be added as custom property
    const selector = (evt as any).selector as string | undefined;
    if (selector !== eventTopic) continue;

    const params = decodeEventParams(evt.inputs, log);
    return {
      name: evt.name,
      signature: formatEventSignature(evt),
      params,
    };
  }

  return null;
}

function decodeEventParams(inputs: AbiInput[], log: LogEntry): DecodedParam[] {
  const params: DecodedParam[] = [];
  let topicIndex = 1; // topic[0] is the event signature
  let dataOffset = 0;
  const data = log.data.startsWith("0x") ? log.data.slice(2) : log.data;

  for (const input of inputs) {
    if (input.indexed) {
      const topic = log.topics[topicIndex];
      topicIndex++;
      if (!topic) continue;

      let value: unknown;
      if (input.type === "address") {
        value = `0x${topic.slice(26)}`;
      } else if (input.type.startsWith("uint") || input.type.startsWith("int")) {
        value = BigInt(topic).toString();
      } else if (input.type === "bool") {
        value = BigInt(topic) !== 0n;
      } else {
        value = topic;
      }

      params.push({ name: input.name, type: input.type, value });
    } else {
      const chunk = data.slice(dataOffset, dataOffset + 64);
      dataOffset += 64;

      let value: unknown;
      if (input.type === "address") {
        value = `0x${chunk.slice(24)}`;
      } else if (input.type.startsWith("uint") || input.type.startsWith("int")) {
        value = chunk ? BigInt(`0x${chunk}`).toString() : "0";
      } else if (input.type === "bool") {
        value = chunk ? BigInt(`0x${chunk}`) !== 0n : false;
      } else {
        value = `0x${chunk}`;
      }

      params.push({ name: input.name, type: input.type, value });
    }
  }

  return params;
}

function formatEventSignature(evt: AbiEvent): string {
  const params = evt.inputs.map((i) => i.type).join(",");
  return `${evt.name}(${params})`;
}
