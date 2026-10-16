import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { isIP } from 'net';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

// The web app's server actions make every demo mutation, so the socket address is
// the web server's. It forwards the visitor's address with a shared secret; the
// address is used only when the secret matches, and only if it is a valid IP.
const forwardedClientAddress = (
  req: Request,
  secret: string | undefined,
): string | undefined => {
  const sent = req.headers['x-seat-sure-client-secret'];
  const address = req.headers['x-seat-sure-client-ip'];
  if (
    !secret ||
    typeof sent !== 'string' ||
    typeof address !== 'string' ||
    isIP(address) === 0
  )
    return undefined;
  return timingSafeEqual(sha256(sent), sha256(secret)) ? address : undefined;
};

interface Bucket {
  count: number;
  expiresAt: number;
}

@Injectable()
export class DemoRequestGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      !this.config.get('demo.enabled') ||
      context.getType<string>() !== 'graphql'
    )
      return true;
    const graphql = GqlExecutionContext.create(context);
    if (
      graphql.getInfo<{ operation: { operation: string } }>().operation
        .operation !== 'mutation'
    )
      return true;
    const { req } = graphql.getContext<{ req: Request }>();
    // Express derives ip from the socket unless main configures an explicit proxy allowlist.
    const identity =
      forwardedClientAddress(req, this.config.get('app.clientAddressSecret')) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();
    for (const [key, bucket] of this.buckets)
      if (bucket.expiresAt <= now) this.buckets.delete(key);
    const limits = this.config.get('demo');
    let bucket = this.buckets.get(identity);
    if (!bucket) {
      if (this.buckets.size >= limits.maxBuckets) return this.reject();
      bucket = { count: 0, expiresAt: now + limits.windowMs };
      this.buckets.set(identity, bucket);
    }
    if (bucket.count >= limits.maxRequests) return this.reject();
    bucket.count += 1;
    return true;
  }

  private reject(): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many demo requests. Please try again later.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
