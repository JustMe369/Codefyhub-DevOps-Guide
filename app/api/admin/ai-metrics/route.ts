import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const runtime = "nodejs";

interface MetricsSnapshot {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  promptInjectionBlocked: number;
  totalTokensIn: number;
  totalTokensOut: number;
  avgLatencyMs: number;
  modelUsage: Record<string, number>;
  languageUsage: Record<string, number>;
  articlesRetrieved: number;
  timestamp: string;
}

/**
 * Get AI metrics from Redis counters.
 * Counters are incremented by the chat route handler via structured logging.
 * In production, these would be consumed from a log aggregator; here we use
 * Redis as a lightweight in-memory metrics store.
 */
export async function GET(): Promise<NextResponse> {
  const metrics: MetricsSnapshot = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    rateLimitedRequests: 0,
    promptInjectionBlocked: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    avgLatencyMs: 0,
    modelUsage: {},
    languageUsage: {},
    articlesRetrieved: 0,
    timestamp: new Date().toISOString(),
  };

  if (redis) {
    try {
      const prefix = "aim:";
      const keys = await redis.keys(`${prefix}*`);

      for (const key of keys) {
        const value = await redis.get(key);
        const num = value ? parseInt(String(value), 10) : 0;
        const metricName = key.replace(prefix, "");

        switch (metricName) {
          case "total_requests":
            metrics.totalRequests = num;
            break;
          case "successful_requests":
            metrics.successfulRequests = num;
            break;
          case "failed_requests":
            metrics.failedRequests = num;
            break;
          case "rate_limited_requests":
            metrics.rateLimitedRequests = num;
            break;
          case "prompt_injection_blocked":
            metrics.promptInjectionBlocked = num;
            break;
          case "total_tokens_in":
            metrics.totalTokensIn = num;
            break;
          case "total_tokens_out":
            metrics.totalTokensOut = num;
            break;
          case "articles_retrieved":
            metrics.articlesRetrieved = num;
            break;
          default:
            // Model usage: aim:model:openrouter/free -> count
            if (metricName.startsWith("model:")) {
              const model = metricName.slice(6);
              metrics.modelUsage[model] = num;
            }
            // Language usage: aim:lang:en -> count
            if (metricName.startsWith("lang:")) {
              const lang = metricName.slice(5);
              metrics.languageUsage[lang] = num;
            }
        }
      }

      // Calculate average latency
      const totalLatencyKey = `${prefix}total_latency_ms`;
      const requestCountKey = `${prefix}total_requests`;
      const totalLatencyVal = await redis.get(totalLatencyKey);
      const requestCountVal = await redis.get(requestCountKey);

      if (totalLatencyVal && requestCountVal) {
        const totalLatency = parseInt(String(totalLatencyVal), 10);
        const requestCount = parseInt(String(requestCountVal), 10);
        metrics.avgLatencyMs = requestCount > 0 ? totalLatency / requestCount : 0;
      }
    } catch {
      // Redis unavailable — return zero metrics
    }
  }

  return NextResponse.json(metrics);
}

/**
 * Helper to increment a counter in Redis. Used by the chat route.
 */
export async function incrementMetric(key: string, value: number = 1): Promise<void> {
  if (!redis) return;
  try {
    await redis.incrby(`aim:${key}`, value);
  } catch {
    // Best-effort
  }
}

/**
 * Helper to add to a latency counter in Redis.
 */
export async function addLatency(latencyMs: number): Promise<void> {
  if (!redis) return;
  try {
    await redis.incrby("aim:total_latency_ms", Math.round(latencyMs));
  } catch {
    // Best-effort
  }
}
