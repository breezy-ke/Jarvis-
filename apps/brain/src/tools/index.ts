import { builtinTools } from "./builtin.js";
import type { ToolDefinition } from "./registry.js";

/**
 * Everything Jarvis can do.
 *
 * Google account tools join this list in Phase 2, gated on credentials being
 * present — an unconfigured integration should simply not appear, rather than
 * being offered to Claude and then failing.
 */
export const allTools: ToolDefinition[] = [...builtinTools];

export { toClaudeTool, defineTool } from "./registry.js";
export type { ToolContext, ToolDefinition, ToolResult } from "./registry.js";
