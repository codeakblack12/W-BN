import { Controller, Delete, Get, Param, Post, Request, ValidationPipe, BadRequestException, Body, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateCategoryDto } from './dto/post.dto';
import { InventoryGuard } from "./inventory.guard"

@Controller('inventory')
export class InventoryController {

    constructor(private readonly service: InventoryService) {}

    // Generate Bar/QR Codes
    @Get('generate-codes/:amt')
    async generateCodes(@Request() req, @Param('amt') amt: string){
        return this.service.generateCodes(+amt)
    }

    @Get('category')
    async getCategories(){
        return this.service.getCategories()
    }

    // @UseGuards(InventoryGuard)
    // @Post('category/create')
    // async createCategory(@Body(new ValidationPipe()) payload: CreateCategoryDto){
    //     try {
    //         return this.service.createCategory(payload)
    //     } catch (error) {
    //         throw new BadRequestException();
    //     }
    // }

    @UseGuards(InventoryGuard)
    @Post('add/:id')
    async addToInventory(@Request() req, @Param('id') id: string){
        return this.service.addOrRemove(id, "plus", req.user)
    }

    @UseGuards(InventoryGuard)
    @Delete('remove/:id')
    async removeFromInventory(@Request() req, @Param('id') id: string){
        return this.service.addOrRemove(id, "minus", req.user)
    }

}
