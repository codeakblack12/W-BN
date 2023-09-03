import { Prop,  Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Date, ObjectId } from "mongoose";
import { Role } from "src/auth/schemas/auth.schema";

export enum NotificationTag {
    USER = 'USER',
    WAREHOUSE = 'WAREHOUSE',
    CATEGORY = 'CATEGORY',
    INVENTORY = 'INVENTORY',
    DOCKYARD = 'DOCKYARD',
    PAYMENT = 'PAYMENT',
    SECURITY = 'SECURITY',
}

@Schema({
    timestamps: true
})

export class Notification {

    @Prop()
    title: string;

    @Prop()
    description: string;

    @Prop()
    warehouse: string[];

    @Prop()
    role: Role[];

    tag: NotificationTag

}

export const NotificationSchema = SchemaFactory.createForClass(Notification)