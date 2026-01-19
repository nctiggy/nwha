// NWHA Entry Point
import { createServer } from './server.js';

const PORT = process.env.PORT || 3000;

async function main() {
  const server = await createServer();

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`NWHA server listening on port ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
