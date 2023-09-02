import { Prop,  Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Date, ObjectId } from "mongoose";

export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    INVENTORY = 'INVENTORY_MANAGEMENT',
    SALES = 'SALES',
    SECURITY = 'SECURITY'
}

export enum Platform {
    MOBILE = 'MOBILE',
    DESKTOP = 'DESKTOP',
    WEB = 'WEB',
}

@Schema({
    timestamps: true
})

export class User {

    _id: string;

    @Prop()
    firstName: string;

    @Prop()
    lastName: string;

    @Prop()
    email: string;

    @Prop()
    password: string;

    @Prop()
    role: Role[];

    @Prop()
    warehouse: string[];

    @Prop()
    active: boolean;

    @Prop()
    disabled: boolean;
}

@Schema({
    timestamps: true,
})

export class Warehouse {

    _id: mongoose.Schema.Types.ObjectId;

    @Prop()
    address: string;

    @Prop()
    city: string;

    @Prop()
    country: string;

    @Prop()
    currency: string;

    @Prop()
    identifier: string;

    @Prop()
    active: boolean;
}

@Schema({
    timestamps: true
})

export class Reset {

    _id: string;

    @Prop()
    user: mongoose.Schema.Types.ObjectId;

    @Prop()
    token: string;

    @Prop()
    active: boolean;

    @Prop({type: Date})
    expireAt: Date;

}

export const UserSchema = SchemaFactory.createForClass(User)
export const ResetSchema = SchemaFactory.createForClass(Reset)
export const WarehouseSchema = SchemaFactory.createForClass(Warehouse)