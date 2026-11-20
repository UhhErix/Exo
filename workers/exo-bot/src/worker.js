// Exo Bot's Worker: the Interactions endpoint, the cron, and the Gateway Durable Object class (src/gateway.js).
import { route, scheduled } from './router.js';

export { Gateway } from './gateway.js';

export default { fetch: route, scheduled };
