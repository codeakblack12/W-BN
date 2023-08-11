import { BadRequestException, Body, Controller, NotFoundException, Post, ValidationPipe, Get, Request, UseGuards, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from 'src/auth/schemas/auth.schema';
import { UsersGuard } from './users.guard';
import { ChangePasswordDto, UpdateMeDto } from './dto/post.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly service: UsersService) {}

    @UseGuards(UsersGuard)
    @Get('me')
    async getmyProfile(@Request() req): Promise<User[]> {
        return this.service.getMe(req.user)
    }

    @UseGuards(UsersGuard)
    @Put('update-me')
    async updatemyProfile(
        @Request() req,
        @Body(new ValidationPipe()) payload: UpdateMeDto
    ) {
        return this.service.updateMe(req.user, payload)
    }

    @UseGuards(UsersGuard)
    @Put('change-password')
    async changePassword(
        @Request() req,
        @Body(new ValidationPipe()) payload: ChangePasswordDto
    ) {
        return this.service.changePassword(req.user, payload)
    }
}
