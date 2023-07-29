import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsArray, IsString, NotContains, Min, isEnum } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from "src/inventory/dto/post.dto";
import { SALE_LOCATIONS, TRANSACTION_STATUS } from "src/sales/schemas/sales.schema";


export class AddCurrencyDto {
    @ApiProperty()
    @IsNotEmpty()
    country: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsEnum(Currency, { message: "Invalid Currency" })
    currency: Currency;

}

export class GetTransactionDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    ref: string;

    @ApiProperty()
    @IsEnum(TRANSACTION_STATUS)
    status: string;

    @ApiProperty()
    @IsEnum(SALE_LOCATIONS)
    location: string;

    @ApiProperty()
    warehouse: string;


}


export class GetInventoryDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    warehouse: string;

}


export class GetUsersDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    warehouse: string;

}