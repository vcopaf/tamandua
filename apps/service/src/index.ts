import { startServer } from "./server.js";

const port = Number(process.env.TAMANDUA_PORT ?? 4317);
await startServer(port);
console.log(`Tamanduá service listening on http://127.0.0.1:${port}`);
