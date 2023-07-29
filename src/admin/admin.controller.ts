import { Controller, Delete, Get, Param, Post, Request, ValidationPipe, BadRequestException, Body, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateCartDto } from 'src/sales/dto/post.dto';
import { CreateCategoryDto } from 'src/inventory/dto/post.dto';
import { AdminGuard } from './admin.guard';
import { AddCurrencyDto, GetTransactionDto } from './dto/post.dto';

@Controller('admin')
export class AdminController {
    constructor(private readonly service: AdminService) {}

    @UseGuards(AdminGuard)
    @Post('category/create')
    async createCategory(@Body(new ValidationPipe()) payload: CreateCategoryDto){
        try {
            return this.service.createCategory(payload)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Post('country/create')
    async createCountry(@Body(new ValidationPipe()) payload: AddCurrencyDto){
        try {
            return this.service.createCountry(payload)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('countries')
    async getCountries(){
        try {
            return this.service.getCountries()
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('transactions')
    async getTransactions(@Query() query: GetTransactionDto){
        try {
            return this.service.getTransactions(
                query.page, query.limit, query.ref, query.status,
                query.location, query.warehouse
            )
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('inventory')
    async getInventory(@Query() query: GetTransactionDto){
        try {
            return this.service.getInventory(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

}
