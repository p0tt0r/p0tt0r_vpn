import { Controller, Headers, Post, Req, UnauthorizedException } from '@nestjs/common';
import { exec } from 'child_process';
import * as crypto from 'crypto';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

@Controller('deploy')
export class DeployController {
  @Post()
  deploy(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const secret = process.env.DEPLOY_SECRET;

    if (!secret) {
      throw new UnauthorizedException('DEPLOY_SECRET is not set');
    }

    if (!signature || !req.rawBody) {
      throw new UnauthorizedException('Missing signature or raw body');
    }

    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    exec('cd /root/p0tt0r_vpn/backend && ./deploy.sh');

    return { status: 'deploy started' };
  }
}