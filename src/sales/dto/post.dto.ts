import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsArray, IsString, NotContains, Min, IsMongoId, IsOptional } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from "mongoose";
import { DockItem, PAY_METHODS, SALE_LOCATIONS } from "../schemas/sales.schema";
import { Currency } from "src/inventory/dto/post.dto";

export class ObjectIdDto {

    @ApiProperty()
    @IsMongoId()
    _id: ObjectId

}

export class ReceiptDto {

    @ApiProperty()
    @IsMongoId()
    _id: ObjectId

    @ApiProperty()
    @IsOptional()
    type: string
}


export class CreateCartDto {

    @ApiProperty()
    @Min(1)
    counter: number

    @ApiProperty()
    warehouse: string

    @ApiProperty()
    @IsOptional()
    customer_name: string

}

export class CloseCartDto {

    @ApiProperty()
    @NotContains(" ")
    cart: string;

}

export class CreateDockyardCartDto {
    @ApiProperty()
    warehouse: string
}

export class AddToCartDto {
    @ApiProperty()
    @NotContains(" ")
    cart: string;

    @ApiProperty()
    @NotContains(" ")
    item: string;

}

export class CheckoutDockyardCartDto {
    @ApiProperty()
    @IsMongoId()
    id: ObjectId;

    @ApiProperty()
    @NotContains(" ")
    @IsEnum(PAY_METHODS, { each: true, message: "Invalid Payment Method" })
    payment_type: PAY_METHODS;

    @IsOptional()
    email: string

    @IsOptional()
    customer_name: string

}

export class MomoPaymentDto {

    @ApiProperty()
    @IsMongoId()
    id: ObjectId

    @ApiProperty()
    @NotContains(" ")
    phone_number: string;

    @ApiProperty()
    @NotContains(" ")
    @IsEnum(SALE_LOCATIONS, { each: true, message: "Invalid Location" })
    location: SALE_LOCATIONS;

}

export class PaystackLinkDto {

    @ApiProperty()
    @IsMongoId()
    id: ObjectId

    @ApiProperty()
    @NotContains(" ")
    email: string;

    @ApiProperty()
    @IsOptional()
    customer_name: string;

    @ApiProperty()
    @NotContains(" ")
    @IsEnum(SALE_LOCATIONS, { each: true, message: "Invalid Location" })
    location: SALE_LOCATIONS;

}

export class AddToDockyardCartDto {
    @ApiProperty()
    @NotContains(" ")
    cart: string;

    @ApiProperty()
    @IsNotEmpty()
    item: DockItem[];

}


export class AddItemsToDockyardCartDto {
    @ApiProperty()
    @NotContains(" ")
    cart: string;

    @ApiProperty()
    @IsNotEmpty()
    items: DockItem[];

}