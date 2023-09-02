import { Controller, Delete, Get, Param, Post, Request, ValidationPipe, BadRequestException, Body, UseGuards, Query, UsePipes, Put, StreamableFile } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateCartDto, ObjectIdDto } from 'src/sales/dto/post.dto';
import { CreateCategoryDto } from 'src/inventory/dto/post.dto';
import { AdminGuard } from './admin.guard';
import { AddCurrencyDto, GenerateBarcodeDto, GetInventoryDto, GetStatisticsDto, GetTransactionDto, GetTransactionOverviewDto, GetUsersDto, GetWarehouseDto, ToggleWarehouseDto } from './dto/post.dto';
import { ObjectId, Types } from 'mongoose';
import { CreateWarehouseDto, RegisterUserDto } from 'src/auth/dto/post.dto';

@Controller('admin')
export class AdminController {
    constructor(private readonly service: AdminService) {}

    // POST CONTROLLERS

    @UseGuards(AdminGuard)
    @Post('category/create')
    async createCategory(@Body(new ValidationPipe()) payload: CreateCategoryDto){
        try {
            return this.service.createCategory(payload)
        } catch (error) {
            throw new BadRequestException(error);
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


    // GET CONTROLLERS

    @UseGuards(AdminGuard)
    @Get('countries')
    async getCountries(){
        try {
            return this.service.getCountries()
        } catch (error) {
            throw new BadRequestException();
        }
    }

    // @UseGuards(AdminGuard)
    @Get('generate-codes')
    async generateBarcodes(@Query(new ValidationPipe()) query: GenerateBarcodeDto){
        try {
            const file = await this.service.generateBarcodes(query)
            return new StreamableFile(file)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('transactions')
    async getTransactions(@Query(new ValidationPipe()) query: GetTransactionDto){
        try {
            return this.service.getTransactions(
                query.page, query.limit, query.ref, query.status,
                query.location, query.warehouse, query.from, query.to
            )
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('inventory')
    async getInventory(@Query(new ValidationPipe()) query: GetInventoryDto){
        try {
            return this.service.getInventory(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('inventory/:category')
    async getInventoryByCategory(@Query(new ValidationPipe()) query: GetInventoryDto, @Param('category') category: string){
        try {
            console.log(query)
            return this.service.getInventoryByCategory(category, query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('users')
    async getUsers(@Query(new ValidationPipe()) query: GetUsersDto){
        try {
            return this.service.getUsers(query)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Get('warehouses')
    async getWarehouses(@Query(new ValidationPipe()) query: GetWarehouseDto){
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


    // PUT CONTROLLERS

    @UseGuards(AdminGuard)
    @Put("activate-warehouse")
    async activateWarehouse(@Body(new ValidationPipe()) payload: ToggleWarehouseDto){
        try {
            return this.service.toggleWarehouse(payload.warehouse, true)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Put("deactivate-warehouse")
    async deactivateWarehouse(@Body(new ValidationPipe()) payload: ToggleWarehouseDto){
        try {
            return this.service.toggleWarehouse(payload.warehouse, false)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Put("category/:_id")
    async categoryUpdate(
        @Param(new ValidationPipe()) params: ObjectIdDto,
        @Body(new ValidationPipe({whitelist: true})) payload: CreateCategoryDto
    ){
        try {
            return this.service.updateCategory(params._id, payload)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Put("warehouse/:_id")
    async warehouseUpdate(
        @Param(new ValidationPipe()) params: ObjectIdDto,
        @Body(new ValidationPipe({whitelist: true})) payload: CreateWarehouseDto
    ){
        try {
            return this.service.updateWarehouse(params._id, payload)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    @UseGuards(AdminGuard)
    @Put("user/:_id")
    async userUpdate(
        @Request() req,
        @Param(new ValidationPipe()) params: ObjectIdDto,
        @Body(new ValidationPipe({whitelist: true})) payload: RegisterUserDto
    ){
        try {
            return this.service.updateUser(params._id, payload, req.user)
        } catch (error) {
            throw new BadRequestException();
        }
    }

    // DELETE CONTROLLERS

    @UseGuards(AdminGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Delete('category/:_id')
    async deleteCategory(@Request() req, @Param(new ValidationPipe()) params: ObjectIdDto){
        return this.service.deleteCategory(params._id)
    }

    @UseGuards(AdminGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Delete('inventory/:_id')
    async deleteInventory(@Request() req, @Param(new ValidationPipe()) params: ObjectIdDto){
        return this.service.deleteInventory(params._id)
    }

    @UseGuards(AdminGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Delete('warehouse/:_id')
    async deleteWarehouse(@Request() req, @Param(new ValidationPipe()) params: ObjectIdDto){
        return this.service.deleteWarehouse(params._id)
    }

    @UseGuards(AdminGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Delete('user/:_id')
    async deleteUser(@Request() req, @Param(new ValidationPipe()) params: ObjectIdDto){
        return this.service.deleteUser(params._id)
    }

    @UseGuards(AdminGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Delete('transaction/:_id')
    async deleteTransaction(@Request() req, @Param(new ValidationPipe()) params: ObjectIdDto){
        return this.service.deleteTransaction(params._id)
    }

}
