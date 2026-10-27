import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { z } from "zod";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const FeedbackSchema = z.object({
  messageId: z.string(),
  rating: z.enum(["up", "down"]),
  comment: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback format." }, { status: 400 });
  }

  const { messageId, rating, comment } = parsed.data;

  if (redis) {
    try {
      const key = `feedback:${messageId}`;
      await redis.hset(key, {
        rating,
        comment: comment ?? "",
        createdAt: Date.now().toString(),
      });
      await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
    } catch {
      // Redis unavailable — feedback is best-effort
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET(): Promise<NextResponse> {
  // Aggregate feedback stats from Redis
  const stats = {
    totalFeedback: 0,
    upvotes: 0,
    downvotes: 0,
    avgRating: 0,
  };

  if (redis) {
    try {
      // Scan for feedback keys
      const keys = await redis.keys("feedback:*");
      let upvotes = 0;
      let downvotes = 0;

      for (const key of keys) {
        const data = await redis.hgetall(key);
        if (data?.rating === "up") upvotes += 1;
        if (data?.rating === "down") downvotes += 1;
      }

      stats.totalFeedback = upvotes + downvotes;
      stats.upvotes = upvotes;
      stats.downvotes = downvotes;
      stats.avgRating = stats.totalFeedback > 0 ? (upvotes - downvotes) / stats.totalFeedback : 0;
    } catch {
      // Redis unavailable
    }
  }

  return NextResponse.json(stats);
}
