// The Durable Object class the runtime runs. The knowledge file is bundled as text here (wrangler.toml, [[rules]]). The
// logic is in gateway-durable.js, which the tests load directly.
import KNOWLEDGE from './knowledge.md';
import { GatewayDurable } from './gateway-durable.js';

export class Gateway extends GatewayDurable {
  constructor(ctx, env) {
    super(ctx, env, { knowledge: KNOWLEDGE });
  }
}
