import { Prop,  Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({
    timestamps: true
})
export class Country {

    @Prop()
    country: string;

    @Prop()
    currency: string;

}

export const CountrySchema = SchemaFactory.createForClass(Country)