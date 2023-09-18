import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsArray, IsString, NotContains, Min, isEnum, IsMongoId, IsOptional } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from "src/inventory/dto/post.dto";
import { SALE_LOCATIONS, TRANSACTION_STATUS } from "src/sales/schemas/sales.schema";
import { ObjectId, Types, isObjectIdOrHexString, isValidObjectId } from "mongoose";


export class AddCurrencyDto {
    @ApiProperty()
    @IsNotEmpty()
    country: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsEnum(Currency, { message: "Invalid Currency" })
    currency: Currency;

}

export class AddInventoryDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsMongoId()
    category: ObjectId;

    @ApiProperty()
    @IsNotEmpty()
    warehouse: Currency;

    @ApiProperty()
    @IsNotEmpty()
    @Min(1)
    quantity: number

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
    @IsOptional()
    status: string;

    @ApiProperty()
    @IsEnum(SALE_LOCATIONS)
    @IsOptional()
    location: string;

    @ApiProperty()
    warehouse: string;

    @ApiProperty()
    @IsOptional()
    from: string;

    @ApiProperty()
    @IsOptional()
    to: string;


}


export class GetInventoryDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    warehouse: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    status: string;

}

export class GetWarehouseDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    name: string;

    @ApiProperty()
    status: string;

}


export class GetUsersDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    warehouse: string;

}

export class GetNotificationsDto {
    @ApiProperty()
    limit: number;

    @ApiProperty()
    page: number;

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

export class ToggleWarehouseDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsMongoId()
    warehouse: ObjectId;
}

export class GenerateBarcodeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsMongoId()
    category: ObjectId;

    @ApiProperty()
    amt: number;
}
