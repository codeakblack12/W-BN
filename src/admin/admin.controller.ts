import { Controller, Delete, Get, Param, Post, Request, ValidationPipe, BadRequestException, Body, UseGuards, Query, UsePipes } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateCartDto } from 'src/sales/dto/post.dto';
import { CreateCategoryDto } from 'src/inventory/dto/post.dto';
import { AdminGuard } from './admin.guard';
import { AddCurrencyDto, GetInventoryDto, GetStatisticsDto, GetTransactionDto, GetTransactionOverviewDto, GetUsersDto, GetWarehouseDto } from './dto/post.dto';

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
    async getInventory(@Query() query: GetInventoryDto){
        try {
            return this.service.getInventory(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('inventory/:category')
    async getInventoryByCategory(@Query() query: GetInventoryDto, @Param('category') category: string){
        try {
            return this.service.getInventoryByCategory(category, query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('users')
    async getUsers(@Query() query: GetUsersDto){
        try {
            return this.service.getUsers(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('warehouses')
    async getWarehouses(@Query() query: GetWarehouseDto){
        try {
            return this.service.getWarehouses(query)
        } catch (error) {
            throw new BadRequestException(error);
        }
    }


    @UseGuards(AdminGuard)
    // @UsePipes(new ValidationPipe({ transform: true }))
    @Get('statistics')
    async getStatistics(@Query(new ValidationPipe()) query: GetStatisticsDto){
        try {
            return this.service.getStatistics(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    // @UsePipes(new ValidationPipe({ transform: true }))
    @Get('transaction-overview')
    async getTransactionOverview(@Query(new ValidationPipe()) query: GetTransactionOverviewDto){
        try {
            return this.service.getTransactionOverview(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    // @UsePipes(new ValidationPipe({ transform: true }))
    @Get('inventory-overview')
    async getInventoryOverview(@Query(new ValidationPipe()) query: GetStatisticsDto){
        try {
            return this.service.getInventoryOverview(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

}
