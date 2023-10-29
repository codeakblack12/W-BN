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

@Schema({
    timestamps: true
})
export class InventoryDeleteReport {

    @Prop()
    date: string;

    @Prop()
    category: string;

    @Prop()
    warehouse: string;

    @Prop()
    deletes: number

}

@Schema({
    timestamps: true
})
export class DailyReport {

    @Prop()
    date: string;

    @Prop()
    sent_to: string[];

    @Prop()
    warehouses: {
        name: string;
        currency: string;
        newUsers: number;
        updatedUsers: number;
        addedStock: number;
        total_warehouse_sales: number;
        total_dockyard_sales: number;
        categoryInfo: {
            category: string;
            added: number;
            sold: number;
            total_stock: number;
            dock_sold: number;
            dock_total: number;
            ware_total: number;
            deleted_total: number;
            yesterday_closing_inventory: string;
        }[];
    }[];

}

export const CountrySchema = SchemaFactory.createForClass(Country)
export const InventoryDeleteReportSchema = SchemaFactory.createForClass(InventoryDeleteReport)
export const DailyReportSchema = SchemaFactory.createForClass(DailyReport)