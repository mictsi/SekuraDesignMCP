import { z } from 'zod';

/** Keep optional runtime metadata intact in every parsed MCP response. */
export const runtimeContractSchema = z.object({
  controllers: z.array(z.string()),
  autoSelectors: z.array(z.string()),
  manualOnly: z.array(z.string()),
  notes: z.array(z.string()),
  purposes: z.array(z.enum(['navigation', 'commands', 'disclosure', 'selection'])).optional(),
  stateOwnership: z.object({ controller: z.array(z.string()), application: z.array(z.string()) }).optional(),
  requirements: z.array(z.object({
    controller: z.string(),
    when: z.object({ className: z.string().optional(), attribute: z.string().optional(), value: z.string().optional() }),
    autoMarker: z.string().optional(),
    manualOnly: z.boolean().optional(),
    description: z.string(),
  })).optional(),
  identity: z.object({ attribute: z.string(), requiredFor: z.string(), description: z.string() }).optional(),
  capabilities: z.array(z.string()).optional(),
});
