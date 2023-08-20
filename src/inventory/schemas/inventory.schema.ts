import { Prop,  Schema, SchemaFactory } from "@nestjs/mongoose";
import { ObjectId } from "mongoose";
import { Price } from "../dto/post.dto";

@Schema({
    timestamps: true
})
export class Category {

    @Prop()
    name: string;

    @Prop()
    code: string;

    @Prop()
    price: Price[]

    @Prop()
    stockThreshold: number

    @Prop()
    vat: number

    @Prop()
    covidVat: number

}

@Schema({
    // _id: false,
    timestamps: true
})
export class Inventory {

    @Prop()
    uid: string;

    @Prop()
    creator: string;

    @Prop()
    ref: string;

    @Prop()
    category: string;

    @Prop()
    warehouse: string;

    @Prop()
    inStock: boolean;

}

export class AddToInventory {
    @Prop()
    id: string;

    @Prop()
    warehouse: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category)
export const InventorySchema = SchemaFactory.createForClass(Inventory)