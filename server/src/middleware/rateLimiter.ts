import type { NextFunction, Request, Response } from "express";

class TokenBucket {
  private readonly rate: number;
  private readonly capacity: number;
  private readonly buckets = new Map<number, { tokens: number; lastRefill: number }>();

  constructor({ rate, capacity }: { rate: number; capacity: number }) {
    this.rate = rate;
    this.capacity = capacity;
  }

  consume(userId: number, amount = 1): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(userId) ?? { tokens: this.capacity, lastRefill: now };
    const elapsed = now - bucket.lastRefill;
    const refill = (elapsed / 1000) * this.rate;
    const newTokens = Math.min(this.capacity, bucket.tokens + refill);

    if (newTokens < amount) {
      this.buckets.set(userId, { tokens: newTokens, lastRefill: now });
      return false;
    }

    this.buckets.set(userId, { tokens: newTokens - amount, lastRefill: now });
    return true;
  }
}

const limiter = new TokenBucket({ rate: 0.1, capacity: 3 }); // 1 call / 10s, burst 3

export function enforceRateLimit(req: Request, res: Response, next: NextFunction): void {
  const userId = req.currentUser?.id;
  if (!userId) {
    res.status(401).json({ detail: "Not authenticated" });
    return;
  }

  if (!limiter.consume(userId)) {
    res.status(429).json({ detail: "Rate limit exceeded" });
    return;
  }

  next();
}

