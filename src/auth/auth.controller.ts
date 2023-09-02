import { BadRequestException, Body, Controller, NotFoundException, Post, ValidationPipe, Get, UseGuards } from '@nestjs/common';
import { ConfirmResetPasswordDto, CreateWarehouseDto, LoginUserDto, RegisterUserDto, ResetPasswordDto } from './dto/post.dto';
import { AuthService } from './auth.service';
import { User, Warehouse } from './schemas/auth.schema';
import { AdminGuard } from 'src/admin/admin.guard';

@Controller('auth')
export class AuthController {

    constructor(private readonly service: AuthService) {}

    // Get all users
    @Get('users')
    async getAllUsers(): Promise<User[]> {
        return this.service.getAll()
    }

    // Get all warehouses
    @Get('warehouses')
    async getAllWarehouses(): Promise<Warehouse[]> {
        return this.service.getAllWarehouses()
    }

    // Register User
    @Post('warehouse/create')
    createWarehouse(@Body(new ValidationPipe()) payload: CreateWarehouseDto ) {
        try {
            return this.service.createWarehouse(payload)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    // Register User
    @UseGuards(AdminGuard)
    @Post('register')
    registerUser(@Body(new ValidationPipe()) payload: RegisterUserDto ) {
        try {
            return this.service.registerUser(payload)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    // Login User
    @Post('login')
    loginUser(@Body(new ValidationPipe()) payload: LoginUserDto) {
        try {
            // console.log(payload)
            return this.service.loginUser(payload)
        } catch (error) {
            throw new NotFoundException();
        }
    }

    // Reset Password
    @Post('reset-password')
    resetPassword(@Body(new ValidationPipe()) payload: ResetPasswordDto) {
        try {
            // console.log(payload)
            return this.service.resetPassword(payload)
        } catch (error) {
            throw new NotFoundException();
        }
    }

    // Confirm Password Reset
    @Post('confirm-reset')
    confirmResetPassword(@Body(new ValidationPipe()) payload: ConfirmResetPasswordDto) {
        try {
            // console.log(payload)
            return this.service.confirmResetPassword(payload)
        } catch (error) {
            throw new NotFoundException();
        }
    }
}

// Create User
