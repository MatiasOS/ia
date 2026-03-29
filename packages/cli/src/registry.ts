import type {
  CommandDefinition,
  CommandContext,
  CommandResult,
  CommandRegistry as ICommandRegistry,
} from "./types.js";

export class CommandRegistry implements ICommandRegistry {
  private commands = new Map<string, CommandDefinition>();

  register(command: CommandDefinition): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command "${command.name}" is already registered`);
    }
    this.commands.set(command.name, command);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  list(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: CommandContext,
  ): Promise<CommandResult> {
    const command = this.commands.get(name);
    if (!command) {
      return {
        exitCode: 1,
        error: { code: "UNKNOWN_COMMAND", message: `Unknown command: ${name}` },
      };
    }

    // Validate required args
    for (const argDef of command.args) {
      if (argDef.required && !(argDef.name in args)) {
        return {
          exitCode: 1,
          error: {
            code: "MISSING_ARGUMENT",
            message: `Missing required argument: ${argDef.name}`,
          },
        };
      }
    }

    return command.handler(args, ctx);
  }
}
