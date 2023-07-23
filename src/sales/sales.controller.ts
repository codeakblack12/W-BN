import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Request, StreamableFile, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesGuard } from './sales.guard';
import { ObjectId } from 'mongoose';
import { SalesGateway } from './sales.gateway';
import { CheckoutDockyardCartDto, MomoPaymentDto, ObjectIdDto, PaystackLinkDto } from './dto/post.dto';

@Controller('sales')
export class SalesController {

    constructor(
        private readonly service: SalesService,
        private readonly salesGateway: SalesGateway
    ) {}

    // Get Carts in Warehouse for Mobile
    @UseGuards(SalesGuard)
    @Get('carts')
    async getCarts(@Request() req){
        return this.service.getCarts(req.user)
    }

    @UseGuards(SalesGuard)
    @Delete('delete-all-carts')
    async deleteAllCarts(@Request() req){
        return this.service.deleteAllCarts()
    }

    // Get Carts in Warehouse for Mobile
    @UseGuards(SalesGuard)
    @Get('warehouse-carts')
    async getWarehouseCarts(@Request() req){
        return this.service.getCarts(req.user)
    }

    // Get Carts in Warehouse for Desktop
    @UseGuards(SalesGuard)
    @Get('handler-carts')
    async getHandlerCarts(@Request() req){
        return this.service.getHandlerCarts(req.user)
    }

    // Get Cart
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Get('cart/:_id')
    async getCart(@Request() req, @Param('_id') _id: string){
        try {
            return this.service.getCart(_id)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Get Checkout Summary
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Get('checkout-summary/:_id')
    async getCheckoutSummary(@Request() req, @Param('_id') _id: string){
        try {
            return this.service.getCheckoutSummary(_id)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Cart Clearance
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Post('cart/clearance')
    async cartSecurityApproval(@Request() req, @Body(new ValidationPipe()) payload: ObjectIdDto){
        try {
            return this.service.cartSecurityApproval(req.user, payload._id)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Get Dockyard Carts
    @UseGuards(SalesGuard)
    @Get('dockyard-carts')
    async getDockyardCarts(@Request() req){
        return this.service.getDockyardCarts(req.user)
    }

    // Get Dockyard Cart
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Get('dockyard-cart/:_id')
    async getDockyardCart(@Request() req, @Param() params: ObjectIdDto){
        try {
            return this.service.getDockyardCart(params._id)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Checkout Dockyard Cart
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Post('dockyard-cart/checkout')
    async checkoutDockyardCart(@Request() req, @Body(new ValidationPipe()) payload: CheckoutDockyardCartDto){
        try {
            return this.service.checkoutDockyardCart(req.user, payload)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Checkout Cart
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Post('cart/checkout')
    async checkoutCart(@Request() req, @Body(new ValidationPipe()) payload: CheckoutDockyardCartDto){
        try {
            const resp = await this.service.checkoutCart(req.user, payload)
            this.salesGateway.server.emit(`CHECKOUT-${resp.data.uid}`, resp.data);
            return resp
        } catch (error) {
            throw new BadRequestException(error)
        }
    }


    // Momo Payment
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Post('payment/momo-pay')
    async initiateMomoPayment(@Request() req, @Body(new ValidationPipe()) payload: MomoPaymentDto){
        try {
            return this.service.initiateMomoPayment(req.user, payload)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Momo Webhook
    @Post('payment/momo-webhook')
    async momoWebhook(@Body(new ValidationPipe()) payload: any){
        try {
            return this.service.momoWebhook(payload)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Paystack Payment Link
    @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Post('payment/paystack-link')
    async generatePaystackLink(@Request() req, @Body(new ValidationPipe()) payload: PaystackLinkDto){
        try {
            return this.service.generatePaystackLink(req.user, payload)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

    // Momo Webhook
    @Post('payment/paystack-webhook')
    async paystackWebhook(@Body(new ValidationPipe()) payload: any){
        try {
            const resp = await this.service.paystackWebhook(payload)
            this.salesGateway.server.emit(resp.reference, resp.status);
            return resp
        } catch (error) {
            throw new BadRequestException(error)
        }
    }


    // Generate Receipt
    // @UseGuards(SalesGuard)
    @UsePipes(new ValidationPipe({ transform: true }))
    @Get('generate-receipt/:_id')
    async generateReceipt(@Request() req, @Param() params: ObjectIdDto){
        try {
            const file = await this.service.generateReceipt(params._id)
            return new StreamableFile(file)
        } catch (error) {
            throw new BadRequestException(error)
        }
    }

}
