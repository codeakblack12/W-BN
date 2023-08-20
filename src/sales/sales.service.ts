import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart, DockyardCart, Transaction } from './schemas/sales.schema';
import { Category, Inventory } from 'src/inventory/schemas/inventory.schema';
import mongoose, { ObjectId } from 'mongoose';
import { AddItemsToDockyardCartDto, AddToCartDto, AddToDockyardCartDto, CheckoutDockyardCartDto, CreateCartDto, CreateDockyardCartDto, MomoPaymentDto, PaystackLinkDto } from './dto/post.dto';
import { customAlphabet } from 'nanoid';
import { User, Warehouse } from 'src/auth/schemas/auth.schema';
import { BadRequestException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { promisify } from 'util';
import { generatePdf } from "html-pdf-node"
import { receiptBody, receiptHeader } from 'src/components/common/functions/templates';
import * as JsBarcode from 'jsbarcode';
import { Canvas, createCanvas } from 'canvas';
import * as moment from "moment";

const axios = require('axios').default;

@Injectable()
export class SalesService {

    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Cart.name)
        private cartModel: mongoose.Model<Cart>,
        @InjectModel(DockyardCart.name)
        private dockyardcartModel: mongoose.Model<DockyardCart>,
        @InjectModel(Inventory.name)
        private inventoryModel: mongoose.Model<Inventory>,
        @InjectModel(Category.name)
        private categoryModel: mongoose.Model<Category>,
        @InjectModel(Warehouse.name)
        private warehouseModel: mongoose.Model<Warehouse>,
        @InjectModel(Transaction.name)
        private transactionModel: mongoose.Model<Transaction>,
    ){}

    async createCart(user: User, payload: CreateCartDto){
        const { counter, warehouse } = payload

        const nanoid = customAlphabet(process.env.ALPHA_CAPS)
        const generatedCardId = nanoid(8)

        // Check Warehouse Exists
        const warehouseExists = await this.warehouseModel.findOne({identifier: warehouse})
        if(!warehouseExists){
            console.log("Warehouse does not exist.")
            throw new WsException("Warehouse does not exist.");
        }

        // Check Handler Exists
        const handlerExists = await this.userModel.findOne({_id: user._id})
        if(!handlerExists){
            console.log("Handler does not exist.")
            throw new WsException("Handler does not exist.");
        }

        // Create Cart
        const res = await this.cartModel.create({
            uid: generatedCardId,
            handler: user._id,
            warehouse: warehouse,
            confirmed: false,
            counter,
            items: []
        })

        return res
    }

    async createDockyardCart(user: User, payload: CreateDockyardCartDto){

        const nanoid = customAlphabet(process.env.ALPHA_CAPS)
        const generatedCardId = nanoid(8)

        // Check Handler Exists
        const handlerExists = await this.userModel.findOne({_id: user._id})

        if(!handlerExists){
            console.log("Handler does not exist.")
            throw new WsException("Handler does not exist.");
        }

        // Create Cart
        const res = await this.dockyardcartModel.create({
            uid: `DOCK-${generatedCardId}`,
            handler: user._id,
            warehouse: payload.warehouse,
            confirmed: false,
            items: []
        })

        return res
    }

    async addToCart(user: User, payload: AddToCartDto){

        const { cart, item } = payload

        const carts = await this.cartModel.findOne({uid: cart})

        if(!carts){
            throw new WsException("Cart does not exist");
        }

        const items = await this.inventoryModel.findOne({uid: item})

        if(!items){
            console.log("Item does not exist")
            throw new WsException("Item does not exist");
        }
        if(!items.inStock){
            console.log("Item not in stock")
            throw new WsException("Item not in stock");
        }

        // Get Item Price
        const categoryInfo = await this.categoryModel.findOne({name: items.category})
        const warehouseInfo = await this.warehouseModel.findOne({identifier: user.warehouse[0]})

        if(!categoryInfo || !warehouseInfo){
            throw new WsException("There seems to be an issue with the category or warehouse");
        }

        const categoryPrice = categoryInfo.price.filter((val) => {
            if(val.currency === warehouseInfo.currency){
                return val
            }
        })

        const new_payload = {
            uid: item,
            category: items.category,
            scanned_by: user._id,
            price: categoryPrice[0].value,
            currency: categoryPrice[0].currency
        }

        const old_items = carts.items


        const itmExists = await old_items.filter((val) => {
            if(val.uid === item){
                return val
            }
        })

        if(itmExists.length){
            console.log("Item already in cart")
            throw new WsException("Item already in cart");
        }else{
            await this.cartModel.updateOne(
                {uid: cart},
                {$push: {items: new_payload }}
            )
        }

        const summary = await this.getCheckoutSummary(cart)

        return {
            new_payload,
            summary: summary?.data
        }
    }

    async addToDockyardCart(user: User, payload: AddItemsToDockyardCartDto){

        const { cart, items } = payload

        console.log(payload)

        const carts = await this.dockyardcartModel.findOne({uid: cart})

        if(!carts){
            throw new BadRequestException("Cart does not exist");
        }

        const this_warehouse = await this.warehouseModel.findOne({
            identifier: carts.warehouse
        })

        if(!carts){
            throw new BadRequestException("Warehouse does not exist");
        }

        const all_categories = await this.categoryModel.find()

        // Get Item Price
        const all_items = items.map((item) => {
            // const categoryInfo = await this.categoryModel.findOne({name: item.category})
            const categoryInfo_ = all_categories.filter((category) => {
                if(category.name === item.category){
                    return category
                }
            })


            if(!categoryInfo_.length){
                throw new BadRequestException("Category does not exist");
            }

            const categoryInfo = categoryInfo_[0]

            const price_ = categoryInfo.price.filter((val) => {
                if(val.currency === this_warehouse?.currency){
                    return val
                }
            })
            if(!price_.length){
                throw new BadRequestException("No valid price attached to this item");
            }

            return {
                ...item,
                unit_price: price_[0]?.dockyard_value,
                currency: price_[0]?.currency,
                price: price_[0]?.dockyard_value * item.quantity,
                vat: categoryInfo.vat || 0,
                covidVat: categoryInfo.covidVat || 0
            }
        })

        await this.dockyardcartModel.updateOne(
            {uid: cart},
            {items: all_items, handler: user._id }
        )

        return {
            message: "Successful"
        }

    }

    async deleteFromDockyardCart(user: User, payload: AddToDockyardCartDto){

        // const { cart, item, category } = payload

        // const carts = await this.dockyardcartModel.findOne({uid: cart})

        // if(!carts){
        //     throw new WsException("Cart does not exist");
        // }

        // const old_items = carts.items

        // let new_items = []

        // if(item === "all"){
        //     old_items.filter((item) => {
        //         if(item.category !== category){
        //             new_items.push(item)
        //         }
        //     })
        // }else{
        //     old_items.filter((item_) => {
        //         if(item_.uid !== item){
        //             new_items.push(item_)
        //         }
        //     })
        // }

        // await this.dockyardcartModel.updateOne(
        //     {uid: cart},
        //     {$set: {items: new_items }}
        // )



        // return {
        //     _id: carts._id,
        //     uid: carts.uid,
        //     item_count: new_items.length,
        //     createdAt: carts.createdAt
        // }
    }

    async checkoutDockyardCart(user: User, payload: CheckoutDockyardCartDto){

        const { id, payment_type, email } = payload

        const carts = await this.dockyardcartModel.findById(id)

        if( payment_type === "ONLINE" || payment_type === "MOMO"){
            throw new BadRequestException(`Instant confirmation not allowed for ${payment_type} payment`);
        }

        if(!carts){
            throw new BadRequestException("Cart does not exist");
        }

        await this.dockyardcartModel.updateOne(
            {_id: id},
            {$set: {confirmed: true, payment_type: payment_type}}
        )

        const ref_id = uuidv4()

        const summary = await this.getDockyardCheckoutSummary(carts.uid)

        const transaction_payload = {
            handler: user._id,
            reference: ref_id,
            currency: summary.data.currency,
            amount: summary.data.total,
            status: "COMPLETED",
            customer_contact_info: email || "N/A",
            payment_type: payment_type,
            cart: {
                id: carts._id,
                uid: carts.uid,
                sale_location: "DOCKYARD",
                warehouse: carts.warehouse
            }
        }

        await this.transactionModel.create(transaction_payload)

        return {
            message: 'Successful'
        }

    }

    async checkoutCart(user: User, payload: CheckoutDockyardCartDto){

        const { id, payment_type, email } = payload

        const carts = await this.cartModel.findById(id)

        if( payment_type === "ONLINE" || payment_type === "MOMO"){
            throw new BadRequestException(`Instant confirmation not allowed for ${payment_type} payment`);
        }

        if(!carts){
            throw new BadRequestException("Cart does not exist");
        }

        await this.removeFromStock(id)
        await this.cartModel.updateOne(
            {_id: id},
            {$set: {confirmed: true, payment_type: payment_type}}
        )

        const ref_id = uuidv4()

        const summary = await this.getCheckoutSummary(carts.uid)

        const transaction_payload = {
            handler: user._id,
            reference: ref_id,
            currency: summary.data.currency,
            amount: summary.data.subtotal,
            status: "COMPLETED",
            customer_contact_info: email || "N/A",
            payment_type: payment_type,
            cart: {
                id: carts._id,
                uid: carts.uid,
                sale_location: "WAREHOUSE",
                warehouse: carts.warehouse
            }
        }

        await this.transactionModel.create(transaction_payload)

        return {
            message: 'Successful',
            data: summary.data
        }

    }

    async getCarts(user: User, warehouse: string){

        const warehouse_ = user?.warehouse

        const carts = await this.cartModel.find({
            // warehouse: {$in: warehouse_},
            warehouse: warehouse,
            confirmed: false
        })

        return {
            data: carts
        }

    }

    async getDockyardCarts(user: User, warehouse: string){

        const warehouse_ = user?.warehouse

        const carts = await this.dockyardcartModel.find({
            warehouse: warehouse,
            confirmed: false
        })

        const carts_ = await carts.map((cart) => {
            let item_count = 0
            cart.items?.map((val) => {
                item_count = item_count + val.quantity
            })
            return {
                _id: cart._id,
                uid: cart.uid,
                item_count: item_count,
                createdAt: cart.createdAt
            }
        })

        return {
            data: carts_
        }

    }

    async getDockyardCart(id: ObjectId){

        const cart = await this.dockyardcartModel.findById(id)

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        const cart_items = cart.items

        let items = cart_items
        let subtotal = 0
        let covidVat = 0
        let vat = 0

        await cart_items.map((item) => {
            const vat_ = (item.price * item.vat)/100
            const covidVat_ = (item.price * item.covidVat)/100

            vat = vat + vat_
            covidVat = covidVat + covidVat_

            subtotal = subtotal + item.price

        })

        const total = subtotal + covidVat + vat

        return {
            data: {
                _id: cart._id,
                uid: cart.uid,
                confirmed: cart.confirmed,
                createdAt: cart.createdAt,
                subtotal: subtotal || 0,
                total: total || 0,
                vat: vat || 0,
                vatValue: vat > 0 ? (vat * 100) / subtotal : 0,
                covidVat: covidVat || 0,
                covidVatValue: covidVat > 0 ? (covidVat * 100) / subtotal : 0,
                currency: cart_items[0]?.currency || 'GHS',
                items: items,
                payment_type: cart.payment_type
            }
        }

    }

    async getDockyardCartItems(id: string){

        const cart = await this.dockyardcartModel.findOne({
            uid: id
        })

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        const cart_items = cart.items.map((item) => {
            return {
                category: item.category,
                price: item.price,
                quantity: item.quantity
            }
        })

        return {
            data: cart_items
        }

    }

    async getCart(id: string){

        const cart = await this.cartModel.findOne({
            uid: id
        })

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        const cart_items = cart.items

        const handler = await this.userModel.findById(cart.handler)

        const categories = await this.categoryModel.find()

        let items = []
        let subtotal = 0

        categories.map((cat) => {
            let qty = 0
            let price = 0
            let items_ = []
            cart_items.map((item) => {
                if(item.category === cat.name){
                    price = price + item.price
                    qty = qty + 1
                    items_.push(item)
                }
            })
            if(qty > 0){
                subtotal = subtotal + price
                items.push({
                    category: cat.name,
                    quantity: qty,
                    price: price,
                    items: items_
                })
            }
        })

        return {
                data: {
                _id: cart._id,
                uid: cart.uid,
                merchant: {
                    firstName: handler.firstName,
                    lastName: handler.lastName
                },
                confirmed: cart.confirmed,
                createdAt: cart.createdAt,
                subtotal: subtotal || 0,
                currency: cart_items[0]?.currency || 'N/A',
                items: items
            }
        }

    }

    async getCheckoutSummary(id: string){

        const cart = await this.cartModel.findOne({
            uid: id
        })

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        const cart_items = cart.items

        const categories = await this.categoryModel.find()

        let items = []
        let subtotal = 0

        categories.map((cat) => {
            let qty = 0
            let price = 0
            cart_items.map((item) => {
                if(item.category === cat.name){
                    price = price + item.price
                    qty = qty + 1
                }
            })
            if(qty > 0){
                subtotal = subtotal + price
                items.push({
                    category: cat.name,
                    quantity: qty,
                    price: price,
                })
            }
        })

        return {
            data: {
                _id: cart._id,
                uid: cart.uid,
                confirmed: cart.confirmed,
                createdAt: cart.createdAt,
                subtotal: subtotal || 0,
                currency: cart_items[0]?.currency || 'N/A',
                items: items,
                payment_type: cart.payment_type
            }
        }

    }

    async getDockyardCheckoutSummary(id: string){

        const cart = await this.dockyardcartModel.findOne({
            uid: id
        })

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        const cart_items = cart.items

        let items = cart_items
        let subtotal = 0
        let covidVat = 0
        let vat = 0

        await cart_items.map((item) => {
            const vat_ = (item.price * item.vat)/100
            const covidVat_ = (item.price * item.covidVat)/100

            vat = vat + vat_
            covidVat = covidVat + covidVat_

            subtotal = subtotal + item.price

        })

        const total = subtotal + covidVat + vat

        return {
            data: {
                _id: cart._id,
                uid: cart.uid,
                confirmed: cart.confirmed,
                createdAt: cart.createdAt,
                subtotal: subtotal || 0,
                total: total || 0,
                vat: vat || 0,
                vatValue: vat > 0 ? (vat * 100) / subtotal : 0,
                covidVat: covidVat || 0,
                covidVatValue: covidVat > 0 ? (covidVat * 100) / subtotal : 0,
                currency: cart_items[0]?.currency || 'GHS',
                items: items,
                payment_type: cart.payment_type
            }
        }

    }

    async cartSecurityApproval(user: User, id: ObjectId){

        const cart = await this.cartModel.findById(id)

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        await this.cartModel.updateOne(
            {_id: id},
            {$set: {security_handler: user._id, security_clearance: true }}
        )

        return {
            message: "Successful"
        }

    }

    async getHandlerCarts(user: User, warehouse: string){

        const warehouse_ = user?.warehouse

        const carts = await this.cartModel.find({
            handler: user._id,
            confirmed: false,
            warehouse: warehouse
        })

        return {
            data: carts
        }

    }

    async deleteAllCarts(){

        const carts = await this.cartModel.deleteMany()

        return {
            message: "Successful"
        }

    }

    async getCartById(id: string){

        const carts = await this.cartModel.findById(id)

        return {
            data: carts
        }

    }

    async getMomoAuthToken(){

        // Momo Documentaton
        // https://gist.github.com/chaiwa-berian/5294fdf1360247cf4561c95c8fa740d4

        const response = await axios.post(`${process.env.MOMO_BASE_URL}/collection/token/`, {}, {
            auth: {
                username: process.env.MOMO_USER_ID,
                password: process.env.MOMO_API_KEY
            },
            headers: {
                "Ocp-Apim-Subscription-Key": process.env.MOMO_SUBSCRIPTION_KEY,
                "X-Target-Environment": process.env.MOMO_TARGET_ENVIRONMENT
            },

        })

        return response.data
    }

    async momoRequestPay(amount: number, currency: string, phone_number: string, uid: string){

        const ref_id = uuidv4()

        // CREATE ACCESS TOKEN
        const access = await this.getMomoAuthToken()

        const response = await axios.post(`${process.env.MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
            "amount": amount.toString(),
            "currency": process.env.MOMO_TARGET_ENVIRONMENT  === "sandbox" ? "EUR" : currency,
            "externalId": uid,
            "payer": {
                "partyIdType": "MSISDN",
                "partyId": process.env.MOMO_TARGET_ENVIRONMENT  === "sandbox" ? "46733123453" : phone_number
            },
            "payerMessage": "",
            "payeeNote": ""
        }, {
            headers: {
                "Authorization": `Bearer ${access.access_token}`,
                "Ocp-Apim-Subscription-Key": process.env.MOMO_SUBSCRIPTION_KEY,
                "X-Target-Environment": process.env.MOMO_TARGET_ENVIRONMENT,
                "X-Reference-Id": ref_id,
                // "X-Callback-Url": 'https://bb2b-102-219-153-217.ngrok-free.app/sales/payment/momo-webhook'
            },
        })

        return ref_id
    }

    async initiateMomoPayment(user: User, payload: MomoPaymentDto){
        const { id, phone_number, location } = payload

        let cart

        if(location === "WAREHOUSE"){
            cart = await this.cartModel.findById(id)
        }else{
            cart = await this.dockyardcartModel.findById(id)
        }

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        const cart_items = cart.items

        if(!cart_items.length){
            throw new BadRequestException("Cart is empty");
        }

        const currency = cart_items[0]?.currency
        let subtotal = 0

        await cart_items.map((val) => {
            subtotal = subtotal + val.price
        })

        const ref_id = await this.momoRequestPay(subtotal, currency, phone_number, cart.uid)

        const transExist = await this.transactionModel.findOne({
            'cart.id': cart._id
        })

        const transaction_payload = {
            handler: user._id,
            reference: ref_id,
            currency: currency,
            amount: subtotal,
            status: "PENDING",
            customer_contact_info: phone_number,
            payment_type: "MOMO",
            cart: {
                id: cart._id,
                uid: cart.uid,
                sale_location: location,
                warehouse: cart.warehouse
            }
        }

        if(!transExist){
            await this.transactionModel.create(transaction_payload)
        }else{
            await this.transactionModel.findOneAndUpdate(
                {'cart.id': cart._id},
                {'$set': transaction_payload}
            )
        }

        return {
            reference: ref_id
        }

    }

    async momoWebhook(payload: any){
        console.log(payload)
        return payload
    }

    async paystackLink(amount: number, currency: string, email: string){
        let secret_key
        if(currency === "GHS"){
            secret_key = process.env.PAYSTACK_GHANA_SECRET_KEY
        }else{
            secret_key = process.env.PAYSTACK_SECRET_KEY
        }
        const header = {
            Authorization: `Bearer ${secret_key}`
        }

        const ref_id = uuidv4()

        const data = {
            reference: ref_id,
            amount: Number(amount) * 100,
            currency: currency,
            callback_url: `www.google.com`,
            email: email
        }

        const response = await axios.post(process.env.PAYSTACK_BASE_URL, data, {
            headers: header,
        })

        return {
            link: response?.data?.data?.authorization_url,
            reference: ref_id
        }
    }

    async generatePaystackLink(user: User, payload: PaystackLinkDto){
        const { id, email, location } = payload

        let cart

        if(location === "WAREHOUSE"){
            cart = await this.cartModel.findById(id)
        }else{
            cart = await this.dockyardcartModel.findById(id)
        }

        if(!cart){
            throw new BadRequestException("Cart does not exist");
        }

        const cart_items = cart.items

        if(!cart_items.length){
            throw new BadRequestException("Cart is empty");
        }

        const currency = cart_items[0]?.currency
        let total = 0

        if(location === "WAREHOUSE"){
            await cart_items.map((val) => {
                total = total + val.price
            })
        }else{
            const summary = await this.getDockyardCheckoutSummary(cart.uid)
            console.log(summary)
            total = summary.data.total
        }

        const pay = await this.paystackLink(total, currency, email)

        const transExist = await this.transactionModel.findOne({
            'cart.id': cart._id
        })

        const transaction_payload = {
            handler: user._id,
            reference: pay.reference,
            currency: currency,
            amount: total,
            status: "PENDING",
            customer_contact_info: email,
            payment_type: "ONLINE",
            cart: {
                id: cart._id,
                uid: cart.uid,
                sale_location: location,
                warehouse: cart.warehouse
            }
        }

        if(!transExist){
            await this.transactionModel.create(transaction_payload)
        }else{
            await this.transactionModel.findOneAndUpdate(
                {'cart.id': cart._id},
                {'$set': transaction_payload}
            )
        }

        return {
            link: pay.link,
            reference: pay.reference
        }
    }

    async paystackWebhook(payload: any){
        const { event, data } = payload

        if(event !== 'charge.success'){
            return {
                reference: data.reference,
                status: "FAILED"
            }
        }

        const transExist = await this.transactionModel.findOne({
            'reference': data.reference
        })

        const { cart } = transExist

        if(!transExist){
            return {
                reference: data.reference,
                status: "FAILED"
            }
        }

        await this.transactionModel.findOneAndUpdate(
            {'reference': data.reference},
            {'$set': {
                status: "COMPLETED"
            }}
        )

        if(cart.sale_location === "WAREHOUSE"){
            await this.removeFromStock(cart.id)
            await this.cartModel.updateOne(
                {_id: cart.id},
                {$set: {confirmed: true, payment_type: "ONLINE"}}
            )
        }else{
            await this.dockyardcartModel.updateOne(
                {_id: cart.id},
                {$set: {confirmed: true, payment_type: "ONLINE"}}
            )
        }

        let summary

        if(cart.sale_location === "WAREHOUSE"){
            summary = await this.getCheckoutSummary(cart.uid)
        }else{
            summary = await this.getDockyardCheckoutSummary(cart.uid)
        }

        return {
            reference: data.reference,
            status: "SUCCESSFUL",
            data: summary.data
        }

    }

    async removeFromStock(id: any){
        const carts = await this.cartModel.findById(id)
        const items = carts.items.map((val) => {
            return val.uid
        })
        await this.inventoryModel.updateMany(
            {uid: {$in: items}},
            {$set: {inStock: false}}
        )
    }

    async generateWareReceipt(id: ObjectId){
        const carts = await this.cartModel.findById(id)

        if(!carts){
            throw new BadRequestException("Cart does not exist");
        }

        const summary = await this.getCheckoutSummary(carts.uid)
        const handler = await this.userModel.findOne({_id: carts.handler})

        let options = { format: 'A5' };

        var barcode__ = new Canvas(500, 400, "image");

        await JsBarcode(barcode__, carts.uid, {
            width: 2, height: 100, text: "", displayValue: false
        })

        const barcode = barcode__?.toDataURL()

        let file = await { content: `
            <html lang="en">
                ${receiptHeader()}
                ${receiptBody(summary.data, handler, carts, "Warehouse", barcode, moment(new Date(carts.createdAt)).format('MMM Do YYYY, h:mm a'))}
            </html>
        `};

        const output = await generatePdf(file, options)

        return output

    }

    async generateDockReceipt(id: ObjectId){
        const carts = await this.dockyardcartModel.findById(id)

        if(!carts){
            throw new BadRequestException("Cart does not exist");
        }

        const summary = await this.getDockyardCheckoutSummary(carts.uid)
        const handler = await this.userModel.findOne({_id: carts.handler})

        let options = { format: 'A5' };

        var barcode__ = new Canvas(500, 400, "image");

        await JsBarcode(barcode__, carts.uid, {
            width: 2, height: 100, text: "", displayValue: false
        })

        const barcode = barcode__?.toDataURL()

        let file = await { content: `
            <html lang="en">
                ${receiptHeader()}
                ${receiptBody(summary.data, handler, carts, "Dockyard", barcode, moment(new Date(carts.createdAt)).format('MMM Do YYYY, h:mm a'))}
            </html>
        `};

        const output = await generatePdf(file, options)

        const base64_output = `data:application/pdf;base64,${output.toString('base64')}`

        return base64_output

    }
}
