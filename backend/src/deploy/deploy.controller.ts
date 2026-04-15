import { Controller, Post } from '@nestjs/common';
import { exec } from 'child_process';

@Controller('deploy')
export class DeployController {
  @Post()
  deploy() {
    exec('cd /root/p0tt0r_vpn/backend && ./deploy.sh');
    return { status: 'deploy started' };
  }
}