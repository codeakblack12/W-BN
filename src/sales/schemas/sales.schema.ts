import { Prop,  Schema, SchemaFactory } from "@nestjs/mongoose";


export enum PAY_METHODS {
    CASH = 'CASH',
    POS = 'POS',
    ONLINE = 'ONLINE',
    MOMO = 'MOMO'
}

export enum SALE_LOCATIONS {
    DOCKYARD = 'DOCKYARD',
    WAREHOUSE = 'WAREHOUSE',
}

export enum TRANSACTION_STATUS {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

@Schema({
    timestamps: true
})
export class Item {

    @Prop()
    uid: string;

    @Prop()
    scanned_by: string;

    @Prop()
    category: string;

    @Prop()
    currency: string;

    @Prop()
    price: number;

}

@Schema({
    timestamps: true
})
export class DockItem {

    @Prop()
    category: string;

    @Prop()
    quantity: number;

    @Prop()
    unit_price: number;

    @Prop()
    currency: string;

    @Prop()
    price: number;

    @Prop()
    vat: number;

    @Prop()
    covidVat: number;

}

export class TransactionCart {

    @Prop()
    id: string;

    @Prop()
    uid: string;

    @Prop()
    sale_location: SALE_LOCATIONS;

    @Prop()
    warehouse: string;

}

@Schema({
    timestamps: true
})
export class Transaction {

    @Prop()
    cart: TransactionCart;

    @Prop()
    handler: string;

    @Prop()
    reference: string;

    @Prop()
    payment_type: PAY_METHODS;

    @Prop()
    currency: string;

    @Prop()
    amount: number;

    @Prop()
    status: TRANSACTION_STATUS

    @Prop()
    customer_contact_info: string

}

@Schema({
    timestamps: true
})
export class Cart {

    @Prop()
    uid: string;

    @Prop()
    handler: string;

    @Prop()
    security_handler: string;

    @Prop()
    security_clearance: boolean;

    @Prop()
    warehouse: string;

    @Prop()
    payment_type: PAY_METHODS;

    @Prop()
    createdAt: Date;

    @Prop()
    counter: number;

    @Prop()
    confirmed: boolean;

    @Prop()
    items: Item[];

}

@Schema({
    timestamps: true
})
export class DockyardCart {

    @Prop()
    uid: string;

    @Prop()
    handler: string;

    @Prop()
    warehouse: string;

    @Prop()
    payment_type: PAY_METHODS;

    @Prop()
    createdAt: Date;

    @Prop()
    confirmed: boolean;

    @Prop()
    items: DockItem[];

}

export class CreateCart {

    @Prop()
    counter: number;

    @Prop()
    warehouse: string;

}

export class CreateDockyardCart {
    @Prop()
    warehouse: string;
}

export class AddToCart {

    @Prop()
    cart: string;

    @Prop()
    item: string;

}

export class AddToDockyardCart {

    @Prop()
    cart: string;

    @Prop()
    item: string;

    @Prop()
    category: string;

    @Prop()
    warehouse: string;

}

export const CartSchema = SchemaFactory.createForClass(Cart)
export const DockyardCartSchema = SchemaFactory.createForClass(DockyardCart)
export const TransactionSchema = SchemaFactory.createForClass(Transaction)