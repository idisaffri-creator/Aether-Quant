/**
 * OpenTelemetry initialization.
 *
 * - Auto-instruments: HTTP, Express, PostgreSQL, Redis, Pino, etc.
 * - Exports traces to OTLP endpoint (configurable) or stdout (dev).
 * - Spans include service name + version for trace correlation.
 *
 * Set OTEL_EXPORTER_OTLP_ENDPOINT to send to SigNoz / Jaeger / Datadog / Honeycomb.
 * If unset, traces print to stdout (dev) or are dropped (prod).
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { logger } from "./logger";
import { trace } from "@opentelemetry/api";

let sdk: NodeSDK | null = null;

export function initOtel(): void {
  if (sdk) return;
  const serviceName = process.env.OTEL_SERVICE_NAME || "aether-energy";
  const serviceVersion = process.env.GIT_COMMIT || "1.0.0";
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    "deployment.environment": process.env.NODE_ENV || "development",
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: otlpEndpoint
      ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
      : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Reduce noise
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    if (otlpEndpoint) {
      logger.info({ endpoint: otlpEndpoint }, "OpenTelemetry started with OTLP exporter");
    } else {
      logger.info("OpenTelemetry started (no OTLP endpoint set — traces will be dropped or printed)");
    }
  } catch (err) {
    logger.error({ err: (err as Error).message }, "OpenTelemetry failed to start");
  }
}

export async function shutdownOtel(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}

/** Tracer singleton for manual spans. */
export const tracer = trace.getTracer("aether-energy", "1.0.0");
