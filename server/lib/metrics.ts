import client from "prom-client";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"] as const,
  registers: [register],
});

export const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const wsConnections = new client.Gauge({
  name: "ws_active_connections",
  help: "Active WebSocket connections",
  registers: [register],
});

export const authFailures = new client.Counter({
  name: "auth_failures_total",
  help: "Authentication failures",
  labelNames: ["reason"] as const,
  registers: [register],
});

export const cacheHits = new client.Counter({
  name: "cache_hits_total",
  help: "Cache hits",
  labelNames: ["key"] as const,
  registers: [register],
});

export const cacheMisses = new client.Counter({
  name: "cache_misses_total",
  help: "Cache misses",
  labelNames: ["key"] as const,
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "DB query duration",
  labelNames: ["op", "table"] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});
