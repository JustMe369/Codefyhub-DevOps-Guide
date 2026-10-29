import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { isTrustedMutationOrigin } from "@/lib/request-security";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const FeedbackSchema = z.object({
  messageId: z.string().trim().min(8).max(120).regex(/^[a-zA-Z0-9_-]+$/),
  rating: z.enum(["up", "down"]),
  comment: z.string().trim().max(1000).optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "The request origin is not trusted." }, { status: 403 });

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
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const rateKey = `feedback:rate:${ip}`;
      const count = await redis.incr(rateKey);
      if (count === 1) await redis.expire(rateKey, 60);
      if (count > 20) return NextResponse.json({ error: "Feedback rate limit exceeded." }, { status: 429 });
      const key = `feedback:${messageId}`;
      const previous = await redis.hgetall<{ rating?: string }>(key);
      await redis.hset(key, {
        rating,
        comment: comment ?? "",
        createdAt: Date.now().toString(),
      });
      await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
      if (previous?.rating && previous.rating !== rating) await redis.incrby(`feedback:count:${previous.rating}`, -1);
      if (!previous?.rating || previous.rating !== rating) await redis.incrby(`feedback:count:${rating}`, 1);
    } catch {
      // Redis unavailable — feedback is best-effort
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireAdminIdentity(request.headers, "ai.manage");
  const stats = {
    totalFeedback: 0,
    upvotes: 0,
    downvotes: 0,
    avgRating: 0,
  };

  if (redis) {
    try {
      const [upvotesRaw, downvotesRaw] = await redis.mget<number[]>("feedback:count:up", "feedback:count:down");
      const upvotes = Number(upvotesRaw ?? 0);
      const downvotes = Number(downvotesRaw ?? 0);

      stats.totalFeedback = upvotes + downvotes;
      stats.upvotes = upvotes;
      stats.downvotes = downvotes;
      stats.avgRating = stats.totalFeedback > 0 ? (upvotes - downvotes) / stats.totalFeedback : 0;
    } catch {
      // Redis unavailable
    }
  }

  return NextResponse.json(stats);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
