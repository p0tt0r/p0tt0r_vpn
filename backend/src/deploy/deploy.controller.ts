import { Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { exec } from 'child_process';

@Controller('deploy')
export class DeployController {
  @Post()
  deploy(@Headers('x-deploy-secret') secret: string) {
    if (secret !== process.env.DEPLOY_SECRET) {
      throw new UnauthorizedException('Invalid deploy secret');
    }

    exec('cd /root/p0tt0r_vpn/backend && ./deploy.sh');

    return { status: 'deploy started' };
  }
}