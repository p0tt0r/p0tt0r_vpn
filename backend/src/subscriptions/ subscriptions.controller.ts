import { Body, Controller, Get, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  getAll() {
    return this.subscriptionsService.getAll();
  }

  @Post()
  create(@Body() body: { userId: string; planId: string }) {
    return this.subscriptionsService.create(body.userId, body.planId);
  }
}