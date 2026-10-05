// Start the standalone server on all interfaces. Railway injects PORT; default 3000 locally.
// HOSTNAME is forced because containers set it to their own hostname, which
// would stop the server from accepting outside traffic.
process.env.HOSTNAME = "0.0.0.0";
process.env.PORT ||= "3000";
await import("../.next/standalone/server.js");
