/**
 * BullMQ job queue for backtests.
 *
 * Long-running backtests (5+ symbols, 2+ years) are offloaded to a worker
 * so the API request thread isn't blocked. The UI polls /api/backtest/job/:id
 * to get status + result.
 */
import { Queue, Worker, type Job } from "bullmq";
import { redis } from "../../lib/redis";
import { runBacktest, type BacktestInput } from "../trading/backtest";
import { logger } from "../../lib/logger";

const QUEUE_NAME = "backtest";
const RESULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

let queueInstance: Queue | null = null;
let workerInstance: Worker | null = null;

export interface BacktestJobData {
  userId: string;
  input: BacktestInput;
}

export interface BacktestJobResult {
  status: "completed" | "failed";
  result?: any;
  error?: string;
}

function getQueue(): Queue {
  if (!queueInstance) {
    queueInstance = new Queue(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: RESULT_TTL_MS / 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    });
  }
  return queueInstance;
}

/**
 * Enqueue a backtest job. Returns the job ID for polling.
 */
export async function enqueueBacktest(data: BacktestJobData): Promise<string> {
  const job = await getQueue().add(QUEUE_NAME, data, {
    priority: data.input.symbol ? 1 : 5,
  });
  logger.info({ jobId: job.id, userId: data.userId, symbol: data.input.symbol }, "backtest queued");
  return job.id!;
}

/**
 * Get job status + result. Returns null if job not found.
 */
export async function getBacktestJob(jobId: string): Promise<{
  state: "waiting" | "active" | "completed" | "failed" | "delayed" | "unknown";
  progress: number;
  result?: BacktestJobResult;
  error?: string;
} | null> {
  const job = await getQueue().getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  const progress = job.progress || 0;
  if (state === "completed") {
    return { state, progress: 100, result: job.returnvalue as BacktestJobResult };
  }
  if (state === "failed") {
    return { state, progress, error: job.failedReason || "Unknown error" };
  }
  return { state, progress };
}

/**
 * Start the worker (idempotent).
 */
export async function startBacktestWorker(): Promise<void> {
  if (workerInstance) return;
  workerInstance = new Worker<BacktestJobData, BacktestJobResult>(QUEUE_NAME, async (job) => {
    logger.info({ jobId: job.id, userId: job.data.userId }, "backtest job started");
    try {
      const { id, result } = await runBacktest(job.data.userId, job.data.input);
      // Persist result to DB so /api/backtest/:id works
      logger.info({ jobId: job.id, backtestId: id, totalReturn: result.totalReturnPct }, "backtest job completed");
      return { status: "completed", result: { id, ...result } };
    } catch (err) {
      logger.error({ err: (err as Error).message, jobId: job.id }, "backtest job failed");
      return { status: "failed", error: (err as Error).message };
    }
  }, {
    connection: redis,
    concurrency: 4,
    limiter: { max: 10, duration: 60_000 }, // 10 jobs per minute
  });
  workerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "backtest worker: job completed");
  });
  workerInstance.on("failed", (job, err) => {
    logger.warn({ jobId: job.id, err: err.message }, "backtest worker: job failed");
  });
  logger.info("backtest worker started (concurrency=4)");
}

export async function stopBacktestWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
}
