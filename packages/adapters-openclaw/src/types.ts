import type { CommandResult } from "@openscan/cli";

export interface OpenClawToolAdapter {
  readonly name: string;
  readonly description: string;
  getSchema(): unknown;
  execute(params: Record<string, unknown>): Promise<CommandResult>;
}

export interface OpenClawManifest {
  name: string;
  version: string;
  description: string;
  capabilities: CapabilityDescriptor[];
  skills: SkillRegistration[];
  tools: ToolRegistration[];
}

export interface CapabilityDescriptor {
  name: string;
  description: string;
  chains: (number | string)[];
}

export interface SkillRegistration {
  name: string;
  description: string;
  skillPath: string;
}

export interface ToolRegistration {
  name: string;
  schema: unknown;
  execute: (params: Record<string, unknown>) => Promise<CommandResult>;
}
