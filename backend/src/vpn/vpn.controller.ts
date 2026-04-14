import { Controller, Get } from '@nestjs/common';
import { VpnService } from './vpn.service';

@Controller('vpn')
export class VpnController {
  constructor(private readonly vpnService: VpnService) {}

  @Get('status')
  getStatus() {
    return this.vpnService.getSystemStatus();
  }
}