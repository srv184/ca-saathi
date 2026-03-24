import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Auth: 5 attempts per 15 minutes per IP
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "rl:auth",
});

// OTP: 3 requests per hour per IP
export const otpRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "rl:otp",
});

// AI: 20 requests per hour per firm
export const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "rl:ai",
});

// General API: 100 requests per minute per firm
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "rl:api",
});

export function getIp(req: Request): string {
  const forwarded = (req.headers as Headers).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
