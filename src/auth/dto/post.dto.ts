import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsArray, IsString } from "class-validator";
import { Role, Platform } from "../schemas/auth.schema";
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
    @ApiProperty()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty({ enum: Role, type: [String]})
    @IsArray()
    // @IsString({ each: true })
    @IsNotEmpty()
    @IsEnum(Role, { each: true, message: "Invalid Role" })
    role: Role[];

    @ApiProperty()
    @IsArray()
    warehouse: [];
}

export class LoginUserDto {
    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @MinLength(8)
    password: string;

    @ApiProperty({ enum: Platform})
    @IsNotEmpty()
    @IsEnum(Platform, { message: "Invalid Platform" })
    platform: Platform;
}

export class CreateWarehouseDto {
    @ApiProperty()
    @IsNotEmpty()
    identifier: string;

    @ApiProperty()
    @IsNotEmpty()
    address: string;

    @ApiProperty()
    @IsNotEmpty()
    city: string;

    @ApiProperty()
    @IsNotEmpty()
    country: string;
}