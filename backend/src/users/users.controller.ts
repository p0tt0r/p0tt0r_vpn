import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers() {
    return this.usersService.getAll();
  }

  @Post()
  createUser(@Body() body: { telegramId?: string; username?: string }) {
    return this.usersService.create(body);
  }

  @Get(':id/subscription')
  getUserSubscription(@Param('id') id: string) {
    return this.usersService.getActiveSubscription(id);
  }

  @Get(':id/access')
  getUserAccess(@Param('id') id: string) {
    return this.usersService.getAccess(id);
  }

  @Get(':id/subscription-url')
  getSubscriptionUrl(@Param('id') id: string) {
    return this.usersService.getSubscriptionUrl(id);
  }

  @Get(':id/vpn-status')
  getUserVpnStatus(@Param('id') id: string) {
    return this.usersService.getUserVpnStatus(id);
  }

  @Get(':id/client-config')
  getClientConfig(@Param('id') id: string) {
    return this.usersService.getClientConfig(id);
  }
}