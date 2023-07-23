import { BadRequestException, Body, Controller, NotFoundException, Post, ValidationPipe, Get, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from 'src/auth/schemas/auth.schema';
import { UsersGuard } from './users.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly service: UsersService) {}

    @UseGuards(UsersGuard)
    @Get('me')
    async getmyProfile(@Request() req): Promise<User[]> {
        return this.service.getMe(req.user)
    }
}
