import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsArray, IsString, NotContains, Min, ValidateNested, Max } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { Prop } from "@nestjs/mongoose";
import { Type } from "class-transformer";

export enum Currency {
    NGN = 'NGN',
    GHS = 'GHS'
}

export class Price {
    @Prop()
    @IsNotEmpty()
    @IsEnum(Currency, { each: true, message: "Invalid Currency" })
    currency: Currency

    @Prop()
    @IsNotEmpty()
    @Min(1)
    value: number

    @Prop()
    @IsNotEmpty()
    @Min(1)
    dockyard_value: number
}

export class CreateCategoryDto {
    @ApiProperty()
    @MinLength(2)
    // @NotContains(" ")
    name: string;

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => Price)
    price: Price[]

    @ApiProperty()
    @Prop()
    @IsNotEmpty()
    @Min(1)
    stockThreshold: number

    @ApiProperty()
    @Prop()
    @Min(0)
    @Max(100)
    vat: number

    @ApiProperty()
    @Prop()
    @Min(0)
    @Max(100)
    covidVat: number

}