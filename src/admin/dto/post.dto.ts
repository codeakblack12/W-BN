import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsArray, IsString, NotContains, Min, isEnum } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from "src/inventory/dto/post.dto";


export class AddCurrencyDto {
    @ApiProperty()
    @IsNotEmpty()
    country: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsEnum(Currency, { message: "Invalid Currency" })
    currency: Currency;

}