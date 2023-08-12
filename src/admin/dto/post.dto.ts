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

export class GetWarehouseDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

}


export class GetUsersDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    warehouse: string;

}

export class GetTransactionOverviewDto {
    @ApiProperty()
    @IsNotEmpty()
    from: string;

    @ApiProperty()
    @IsNotEmpty()
    to: string;

    @ApiProperty()
    @IsNotEmpty()
    warehouse: string;

    // @ApiProperty()
    // @IsNotEmpty()
    // @IsEnum(Currency, { message: "Invalid Currency" })
    // currency: Currency;
}


export class GetStatisticsDto {
    @ApiProperty()
    @IsNotEmpty()
    warehouse: string;
}