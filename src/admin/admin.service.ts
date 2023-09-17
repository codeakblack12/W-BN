import mongoose, { ObjectId, Types, isObjectIdOrHexString } from 'mongoose';
import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Role, User, Warehouse } from 'src/auth/schemas/auth.schema';
import { Cart, DockyardCart, Transaction } from 'src/sales/schemas/sales.schema';
import { Category, Inventory } from 'src/inventory/schemas/inventory.schema';
import { CreateCategoryDto } from 'src/inventory/dto/post.dto';
import { AddCurrencyDto, GenerateBarcodeDto, GetInventoryDto, GetNotificationsDto, GetStatisticsDto, GetTransactionDto, GetTransactionOverviewDto, GetUsersDto, GetWarehouseDto } from './dto/post.dto';
import { customAlphabet } from 'nanoid';
import { Country } from './schemas/admin.schema';
import { getDateRangeArray } from 'src/components/common/functions/common';
import * as moment from "moment";
import { BarcodeBody } from 'src/components/common/functions/barcode-templates';
import { generatePdf } from "html-pdf-node"
import { CreateWarehouseDto, RegisterUserDto } from 'src/auth/dto/post.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from 'src/notification/notification.service';
import { Notification, NotificationTag } from 'src/notification/schemas/notification.schema';
import { dailyReportBody, dailyReportHead } from 'src/components/common/functions/templates';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Cart.name)
        private cartModel: mongoose.Model<Cart>,
        @InjectModel(DockyardCart.name)
        private dockyardcartModel: mongoose.Model<DockyardCart>,
        @InjectModel(Inventory.name)
        private inventoryModel: mongoose.Model<Inventory>,
        @InjectModel(Notification.name)
        private notificationModel: mongoose.Model<Notification>,
        @InjectModel(Category.name)
        private categoryModel: mongoose.Model<Category>,
        @InjectModel(Country.name)
        private countryModel: mongoose.Model<Country>,
        @InjectModel(Transaction.name)
        private transactionModel: mongoose.Model<Transaction>,
        @InjectModel(Warehouse.name)
        private warehouseModel: mongoose.Model<Warehouse>,

        private notificationService: NotificationService,
        private mailService: MailService,

        // private readonly logger = new Logger(AdminService.name)

    ){}

    // CREATE SERVICES

    async createCountry(payload: AddCurrencyDto){
        const { country, currency } = payload

        const countries = await this.countryModel.find()

        countries.map((val: Country) => {
            if(country === val.country){
                throw new BadRequestException("Country already exists");
            }
            if(currency === val.currency){
                throw new BadRequestException("Currency already exists");
            }
        })

        const res = await this.countryModel.create({
            country,
            currency
        })

        return {
            message: "Successful"
        }

    }

    async createCategory(payload: CreateCategoryDto){
        const { name, price, stockThreshold } = payload
        const categories = await this.categoryModel.findOne({name: name.toLocaleLowerCase()})

        let duplicates = []

        price.map((val) => {
            if(duplicates.includes(val.currency)){
                throw new BadRequestException("Duplicate Currencies");
            }
            duplicates.push(val.currency)
        })

        if(categories){
            throw new BadRequestException("Category already exists");
        }

        const nanoid = customAlphabet(name.replace(/\s/g, '').toLowerCase())

        const category_code = `${name[0].toLowerCase()}${nanoid(2)}`

        const category_codes = await this.categoryModel.findOne({code: category_code})

        if(category_codes){
            throw new BadRequestException("Seems something went wrong, please try again.");
        }

        const res = await this.categoryModel.create({
            name: name.toLocaleLowerCase(),
            code: category_code,
            price,
            stockThreshold,
            vat: payload.vat,
            covidVat: payload.covidVat
        })

        const warehouses = await this.warehouseModel.find()
        const warehouseArr = warehouses.map((val) => {
            return val.identifier
        })

        await this.notificationService.addNotification({
            title: 'Category Created',
            description: `${name} was just created`,
            warehouse: warehouseArr,
            role: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
            tag: NotificationTag.USER
        })

        return {
            message: "Successful"
        }

    }


    // DELETE SERVICES

    async deleteCategory(id: ObjectId){
        await this.categoryModel.deleteOne({
            "_id": id
        })

        return {
            message: "Successful"
        }
    }

    async deleteInventory(id: ObjectId){
        await this.inventoryModel.deleteOne({
            "_id": id
        })

        return {
            message: "Successful"
        }
    }

    async deleteWarehouse(id: ObjectId){
        await this.warehouseModel.deleteOne({
            "_id": id
        })

        return {
            message: "Successful"
        }
    }

    async deleteUser(id: ObjectId){
        await this.userModel.deleteOne({
            "_id": id
        })

        return {
            message: "Successful"
        }
    }

    async deleteTransaction(id: ObjectId){
        await this.transactionModel.deleteOne({
            "_id": id
        })

        return {
            message: "Successful"
        }
    }


    // READ SERVICES

    async getCountries(){

        const countries = await this.countryModel.find()

        return {
            data: countries
        }

    }

    async getTransactions(
        page: number, limit: number, ref: string, status: string,
        location: string, warehouse: string, from: string, to: string
    ){
        const page_ = page || 1
        const limit_ = limit || 10
        const from_ = from || "1900-01-01"
        const to_ = to || "2100-01-01"

        const query = {
            // "reference": { $regex: ref || "", $options: 'i' },
            "$or": [
                {"reference": { $regex: ref || "", $options: 'i' }},
                {"customer_contact_info": { $regex: ref || "", $options: 'i' }},
                {"customer_name": { $regex: ref || "", $options: 'i' }},
            ],
            "status": { $regex: status || "" },
            "createdAt":{$gte:new Date(from_),$lt: new Date(to_)},
            "cart.sale_location": {$regex: location || ""},
            "cart.warehouse": {$regex: warehouse || ""},
        }
        const transactions = await this.transactionModel
        .find(query)
        .sort( { "updatedAt": -1 } )
        .skip(Number(page_) > 0 ? (Number(page_) - 1) * Number(limit_) : 0)
        .limit(limit_)
        const total_transactions = await this.transactionModel.find(query).count()
        const number_of_pages = Math.ceil(total_transactions / Number(limit_))
        return {
            data: transactions,
            total: total_transactions,
            pages: number_of_pages,
            next: Number(page_) + 1 > number_of_pages ? "" : Number(page_) + 1
        }
    }

    async getInventory(query: GetInventoryDto){

        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 10
        const warehouse = query.warehouse || ""
        const name = query.name || ""
        const status = query.status || ""

        const aggregate = [
            // {$sort: { "name": 1 }},
            {
                $lookup: {
                    from: "inventories",
                    localField: "name",
                    foreignField: "category",
                    pipeline: [
                        {   $match: {
                                inStock: true,
                                warehouse: {$regex: warehouse},
                            }
                        }
                    ],
                    as: "items"
                },
            },
            { $addFields: {
                stock: {$size: "$items"},
            }},
            {
                $project: {
                    _id: 1,
                    name: 1,
                    code: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    stock: 1,
                    stockThreshold: 1,
                    vat: 1,
                    covidVat: 1,
                    price: 1,
                    status: {
                        $switch: {
                            "branches": [
                                { "case": { "$gt": [ "$stock", "$stockThreshold" ] }, "then": "In Stock" },
                                { "case": { "$eq": [ "$stock", 0 ] }, "then": "Out of Stock" }
                            ],
                            "default": "Low in Stock"
                        }
                    }
                }
            },
            {
                $match: {
                    // name: {$regex: name, $options: 'i'},
                    "$or": [
                        {"name": { $regex: name || "", $options: 'i' }},
                        {"code": { $regex: name || "", $options: 'i' }}
                    ],
                    status: {$regex: status}
                }
            },
        ]

        const inventory = await this.categoryModel.aggregate(aggregate)
        .sort({ name: 1 })
        .skip(page > 0 ? (page - 1) * limit : 0)
        .limit(limit)

        const total_categories = await this.categoryModel.find().count()
        const number_of_pages = Math.ceil(total_categories / limit)

        return {
            data: inventory,
            total: total_categories,
            pages: number_of_pages,
            next: page + 1 > number_of_pages ? "" : page + 1
        }
    }

    async getInventoryByCategory(category: string, query: GetInventoryDto){
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 10
        const warehouse = query.warehouse || ""
        const name = query.name || ""

        const queryAggregate = [
            {
                $match: {
                    category: category,
                    warehouse: { $regex: warehouse },
                    ref: { $regex: name, $options: 'i' },
                    inStock: true
                }
            },
            {$set: {creator: {$toObjectId: "$creator"} }},
            {
                $lookup: {
                    from: "users",
                    localField: "creator",
                    foreignField: "_id",
                    pipeline: [
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1
                            }
                        }
                    ],
                    as: "creator_details"
                }
            },
            {$unwind:"$creator_details"},
        ]

        const find_query = {
            category: category,
            warehouse: { $regex: warehouse },
            ref: { $regex: name, $options: 'i' },
            inStock: true
        }

        const inventory = await this.inventoryModel.aggregate(queryAggregate)
        .sort( { "updatedAt": -1 } )
        .skip(Number(page) > 0 ? (Number(page) - 1) * Number(limit) : 0)
        .limit(limit)

        const total_inventory = await this.inventoryModel.find(find_query).count()
        const number_of_pages = Math.ceil(total_inventory / Number(limit))

        return {
            data: inventory,
            total: total_inventory,
            pages: number_of_pages,
            next: page + 1 > number_of_pages ? "" : Number(page) + 1
        }
    }

    getRoleString (role: Array<Role>) {
        const RoleString = {
            'SUPER_ADMIN': 'Super Admin',
            'ADMIN': 'Admin',
            'MANAGER': 'Manager',
            'INVENTORY_MANAGEMENT': 'Inventory Manager',
            'SALES': 'Sales',
            'SECURITY': 'Security'
        }

        let string = ""
        role.map((val, index) => {
            if(index === 0){
                string = RoleString[val]
            }else{
                string = string + `, ${RoleString[val]}`
            }
        })

        return string
    }

    async getUsers(query: GetUsersDto){
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 10
        const warehouse = query.warehouse

        let find_query

        find_query = warehouse ? { warehouse: warehouse } : {}

        const users = await this.userModel.find(find_query, {password: 0})
        .sort( { "name": 1 } )
        .skip(Number(page) > 0 ? (Number(page) - 1) * Number(limit) : 0)
        .limit(limit)

        const total_users = await this.userModel.find(find_query).count()
        const number_of_pages = Math.ceil(total_users / Number(limit))

        const processed = await users.map((user) => {
            const role_string = this.getRoleString(user.role)

            const proc = {
                ...user.toJSON(),
                status: user.disabled ? "Disabled" : (user.active ? "Active" : "Pending"),
                role: role_string
            }
            delete proc.disabled
            delete proc.active
            // delete proc.role

            return proc
        })

        return {
            data: processed,
            total: total_users,
            pages: number_of_pages,
            next: page + 1 > number_of_pages ? "" : Number(page) + 1
        }
    }

    async getTransactionOverview(query: GetTransactionOverviewDto){

        const months = ['JAN', 'FEB', 'MAR', 'APR',
            'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
        ]

        const { from, to } = query
        const warehouse = query.warehouse || ""

        if(!from || !to){
            throw new BadRequestException('Invalid dates!');
        }
        const from_arr = from.split("-")
        const to_arr = to.split("-")

        if(
            Number(from_arr[0]) > Number(to_arr[0]) ||
            (
              (Number(from_arr[0]) === Number(to_arr[0])) && (Number(from_arr[1]) > Number(to_arr[1]))
            ) ||
            ( Number(from_arr[1]) > 12 || Number(to_arr[1]) > 12) ||
            ( Number(from_arr[1]) < 1 || Number(to_arr[1]) < 1)
        ){
            throw new BadRequestException('Invalid date range!');
        }

        const dates = await getDateRangeArray(
            `${from}-01`, `${to}-01`
        )

        let transactions = []
        let total = 0

        for (var i = 0; i < dates.length - 1; i++){
            const amount_sum = await this.transactionModel.aggregate([
            { $match: {
                status: {$eq: "COMPLETED"},
                // currency: {$eq: currency},
                "cart.warehouse": warehouse,
                createdAt:{$gte:new Date(dates[i]),$lt: new Date(dates[i + 1])}
            } },
            {$group: {_id: null, gross_sales:{$sum:"$amount"}}}
            ])

            const gross_sales = amount_sum[0]?.gross_sales || 0
            total = total + gross_sales
            transactions.push({
                total: gross_sales,
                // date: dates[i],
                year: new Date(dates[i]).getFullYear(),
                month: months[new Date(dates[i]).getMonth()]
            })
        }

        const inital_total = transactions[0]?.total || 0
        const current_total = transactions[transactions.length - 1]?.total || 0
        const change = inital_total ? (((current_total - inital_total)/(inital_total)) * 100) : 100

        return {
            data: {
                total,
                change: change,
                overview: transactions
            }
        }
    }

    async getStatistics(query: GetStatisticsDto){
        let dayStart = new Date()
        let dayEnd = new Date()
        dayStart.setUTCHours(0,0,0,0)
        dayEnd.setUTCHours(23,59,59,999)

        const { warehouse } = query

        const getWarehouse = await this.warehouseModel.findOne({
            identifier: warehouse
        })

        // STOCKS

        const all_stocks = await this.inventoryModel.find({
            warehouse: warehouse
        }).count()
        const all_out_of_stock = await this.inventoryModel.find({
            inStock: false,
            warehouse: warehouse
        }).count()
        const all_out_of_stock_percentage = (all_out_of_stock/all_stocks) * 100

        const all_stocks_sold_today = await this.inventoryModel.find({
            $and:[
                {updatedAt:{$gte: dayStart}},
                {updatedAt:{$lt: dayEnd}},
                {inStock: {$eq: false}},
                {warehouse: {$eq: warehouse}}
            ]
        }).count()
        const all_sold_today_percentage = (all_stocks_sold_today/all_stocks) * 100


        // SALES

        const gross_sales = await this.transactionModel.aggregate([
            { $match: {
                status: {$eq: "COMPLETED"},
                "cart.warehouse": warehouse,
                "cart.sale_location": "WAREHOUSE",
            } },
            {$group: {_id: null, gross_sales:{$sum:"$amount"}}}
        ])

        const gross_dockyard_sales = await this.transactionModel.aggregate([
            { $match: {
                status: {$eq: "COMPLETED"},
                "cart.warehouse": warehouse,
                "cart.sale_location": "DOCKYARD",
            } },
            {$group: {_id: null, gross_sales:{$sum:"$amount"}}}
        ])

        const total_sales = gross_sales[0]?.gross_sales || 0
        const total_dock_sales = gross_dockyard_sales[0]?.gross_sales || 0

        const aggregate = [
            // {$sort: { "name": 1 }},
            {
                $lookup: {
                    from: "inventories",
                    localField: "name",
                    foreignField: "category",
                    pipeline: [
                        {   $match: {inStock: false, warehouse: warehouse}}
                    ],
                    as: "items"
                },
            },
            { $addFields: {
                sold: {$size: "$items"},
            }},
            {
                $project: {
                    _id: 1,
                    name: 1,
                    // price: 1,
                    sold: 1
                }
            },
        ]

        const dock_aggregate = [
            { $match : { confirmed : true, warehouse: warehouse } },
            {$unwind:"$items"},
            {$group:{
                _id:null,
                itms: {$push : "$items"}
            }},
            {$project:{_id:0, all_items: "$itms"}},
        ]

        const items = await this.categoryModel.aggregate(aggregate)
        const all_dock_items_ = await this.dockyardcartModel.aggregate(dock_aggregate)
        const all_dock_items = all_dock_items_[0]?.all_items

        let dock_items = []
        let dock_total_sold = 0

        await items?.map((val) => {
            let val_total = 0
            all_dock_items?.filter((dock_val) => {
                if(dock_val?.category === val?.name){
                    val_total = val_total + dock_val?.quantity
                }
            })
            dock_total_sold = dock_total_sold + val_total
            dock_items.push({
                ...val,
                sold: val_total
            })
        })

        const items_filtered = items.filter((val) => val.sold > 0)
        const dock_items_filtered = dock_items.filter((val) => val.sold > 0)

        return {
            data: {
                stock: {
                    currency: getWarehouse.currency,
                    total: all_stocks,
                    total_remaining: all_stocks - all_out_of_stock,
                    total_sold: all_out_of_stock,
                    percentage_sold: all_out_of_stock_percentage || 0,
                    total_sold_today: all_stocks_sold_today,
                    percentage_sold_today: all_sold_today_percentage || 0
                },
                sales: {
                    currency: getWarehouse.currency,
                    total: total_sales,
                    total_sold: all_out_of_stock,
                    items: items_filtered
                },
                dockyard_sales: {
                    currency: getWarehouse.currency,
                    total: total_dock_sales,
                    total_sold: dock_total_sold,
                    items: dock_items_filtered
                }
            }
        }
    }

    async getInventoryOverview(query: GetStatisticsDto){
        let dayStart = new Date()
        let dayEnd = new Date()
        dayStart.setUTCHours(0,0,0,0)
        dayEnd.setUTCHours(23,59,59,999)

        const { warehouse } = query

        const new_stocks = await this.inventoryModel.find({
            $and:[
                {createdAt:{$gte: dayStart}},
                {createdAt:{$lt: dayEnd}},
                {warehouse: {$eq: warehouse}}
            ]
        }).count()

        const sold_stocks = await this.inventoryModel.find({inStock: false}).count()
        const total_stocks = await this.inventoryModel.find().count()

        return {
            data: {
                new: new_stocks,
                sold: sold_stocks,
                total: total_stocks
            }
        }
    }

    async getWarehouses(query: GetWarehouseDto){
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 10
        const name = query.name || ""
        const status = query.status || ""

        const aggregate = [
            {
                $lookup: {
                    from: "inventories",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                inStock: true,
                            }
                        }
                    ],
                    as: "items"
                },
            },
            { $addFields: {
                stock: {$size: "$items"},
                status: {
                    $cond: [ { $eq: [ "$active", true ] }, "Active", "Inactive" ]
                }
            }},
            { $unset: "items" },
            {
                $match: {
                    identifier: {$regex: name},
                    status: {$regex: status}
                }
            },

        ]

        const warehouses = await this.warehouseModel.aggregate(aggregate)
        .sort({ "createdAt": 1})
        .skip(Number(page) > 0 ? (Number(page) - 1) * Number(limit) : 0)
        .limit(limit)

        const total_warehouses = await this.warehouseModel.find({}).count()
        const number_of_pages = Math.ceil(total_warehouses / Number(limit))

        return {
            data: warehouses,
            total: total_warehouses,
            pages: number_of_pages,
            next: page + 1 > number_of_pages ? "" : Number(page) + 1
        }

    }

    async generateBarcodes({ category, amt }: GenerateBarcodeDto){

        const nanoid = customAlphabet(process.env.ALPHA_NUM_CAPS)

        const cat = await this.categoryModel.findById(category)

        if(!cat){
            throw new BadRequestException("Category does not exists");
        }

        let ids = []

        for(var i = 0; i < amt; i++){
            ids.push({
                id: `${cat.code}-${nanoid(5)}`,
                title: cat.name,
                code: cat.code
            })
        }

        const PDF_BODY = await BarcodeBody(ids)

        let options = {
            width: '377px',
            height: '340px',
            // preferCSSPageSize: true
         };

        let file = await { content: PDF_BODY};

        const output = await generatePdf(file, options)

        return output
    }

    async getNotifiications( user: User, query: GetNotificationsDto){
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 10

        let find_query = {}

        if(!user.role.includes(Role.SUPER_ADMIN)){
            find_query = {
                warhouse: { "$in": user.warehouse },
                role: {"$in": user.role},
            }
        }

        const notifications = await this.notificationModel.find(find_query,{warehouse: 0, role: 0})
        .sort( { "createdAt": -1 } )
        .skip(Number(page) > 0 ? (Number(page) - 1) * Number(limit) : 0)
        .limit(limit)

        const total_notifications = await this.notificationModel.find(find_query).count()
        const number_of_pages = Math.ceil(total_notifications / Number(limit))

        return {
            data: notifications,
            total: total_notifications,
            pages: number_of_pages,
            next: page + 1 > number_of_pages ? "" : Number(page) + 1
        }
    }


    // UPDATE SERVICES
    async toggleWarehouse(warehouse: ObjectId, status: boolean){
        const ware_ = await this.warehouseModel.findById(warehouse)
        if(!ware_){
            throw new BadRequestException("Warehouse does not exists");
        }
        await this.warehouseModel.findOneAndUpdate(
            { '_id': warehouse },
            {'$set': {
                active: status
            }}
        )

        return {
            message: "Successful"
        }
    }

    async updateCategory(categoryId: ObjectId, payload: CreateCategoryDto){

        const nameExists = await this.categoryModel.findOne({
            $and: [
                {_id: { $ne: categoryId }},
                {name: {$eq: payload.name.toLocaleLowerCase()}}
            ]
        })

        if(nameExists){
            throw new BadRequestException("Category with similar name already exists.");
        }

        const category = await this.categoryModel.findById(categoryId)

        if(!category){
            throw new UnauthorizedException("Category does not exist");
        }

        await this.categoryModel.findOneAndUpdate(
            { '_id': categoryId },
            {
                '$set': {...payload, name: payload.name.toLocaleLowerCase()}
            }
        )

        await this.inventoryModel.updateMany(
            { category: category.name.toLocaleLowerCase() },
            { $set: { "category" : payload.name.toLocaleLowerCase() } }
        );

        const aggregate = [
            { $match: { code: category.code } },
            {
                $lookup: {
                    from: "inventories",
                    localField: "name",
                    foreignField: "category",
                    pipeline: [
                        {   $match: {
                                inStock: true
                            }
                        }
                    ],
                    as: "items"
                },
            },
            { $addFields: {
                stock: {$size: "$items"},
            }},
            {
                $project: {
                    _id: 1,
                    name: 1,
                    code: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    stock: 1,
                    stockThreshold: 1,
                    vat: 1,
                    covidVat: 1,
                    price: 1,
                    status: {
                        $switch: {
                            "branches": [
                                { "case": { "$gt": [ "$stock", "$stockThreshold" ] }, "then": "In Stock" },
                                { "case": { "$eq": [ "$stock", 0 ] }, "then": "Out of Stock" }
                            ],
                            "default": "Low in Stock"
                        }
                    }
                }
            },
        ]

        const newCategory = await this.categoryModel.aggregate(aggregate)

        return {
            data: newCategory[0]
        }
    }

    async updateWarehouse(warehouseId: ObjectId, payload: CreateWarehouseDto){
        const warehouse = await this.warehouseModel.findById(warehouseId)

        if(!warehouse){
            throw new UnauthorizedException("Warehouse does not exist");
        }

        const newData = await this.warehouseModel.findOneAndUpdate(
            { '_id': warehouseId },
            {
                '$set': {...payload}
            }
        )

        return {
            ...payload,
            _id: warehouseId
        }
    }

    async updateUser(userId: ObjectId, payload: RegisterUserDto, user: User){

        const user_ = await this.userModel.findById(userId)

        if(!user_){
            throw new UnauthorizedException("User does not exist");
        }

        // Creation Hierarchy
        if(user.role.includes(Role.ADMIN)){
            if(
                payload.role.includes(Role.SUPER_ADMIN) ||
                payload.role.includes(Role.ADMIN)
            ){
                throw new UnauthorizedException("Not authorized to create this user")
            }
        }
        if(user.role.includes(Role.MANAGER)){
            if(
                payload.role.includes(Role.SUPER_ADMIN) ||
                payload.role.includes(Role.ADMIN) ||
                payload.role.includes(Role.MANAGER)
            ){
                throw new UnauthorizedException("Not authorized to create this user")
            }
        }

        const newData = await this.userModel.findOneAndUpdate(
            { '_id': userId },
            {
                '$set': {...payload}
            }
        )

        return {
            ...payload,
            _id: userId
        }
    }


    // CRON JOBS
    @Cron(CronExpression.EVERY_DAY_AT_10PM)
    async handleDailyReport() {
        var today_start = new Date();
        today_start.setHours(0,0,0,0);

        var today_end = new Date();
        today_end.setHours(23,59,59,999);

        const aggregate = [
            // New Users
            {
                $lookup: {
                    from: "users",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                createdAt: {$gte: today_start, $lt: today_end},
                            }
                        }
                    ],
                    as: "users"
                },
            },
            // Recently Updated users
            {
                $lookup: {
                    from: "users",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                createdAt: {$lt: today_start},
                                updatedAt: {$gte: today_start, $lt: today_end},
                            }
                        }
                    ],
                    as: "updatedusers"
                },
            },

            // Inventories added
            {
                $lookup: {
                    from: "inventories",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                createdAt: {$gte: today_start, $lt: today_end},
                            }
                        }
                    ],
                    as: "stocks"
                },
            },

            // Warehouse Carts
            {
                $lookup: {
                    from: "carts",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                updatedAt: {$gte: today_start, $lt: today_end},
                                confirmed: true
                            }
                        }
                    ],
                    as: "warehousecarts"
                },
            },

            // Dockyard Carts
            {
                $lookup: {
                    from: "dockyardcarts",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                updatedAt: {$gte: today_start, $lt: today_end},
                                confirmed: true
                            }
                        }
                    ],
                    as: "dockyardcarts"
                },
            },

            // Add Fields
            { $addFields: {
                newUsers: {$size: "$users"},
            }},
            { $addFields: {
                updatedUsers: {$size: "$updatedusers"},
            }},
            { $addFields: {
                newStock: {$size: "$stocks"},
            }},

            // Remove Unnecessary Fields
            {
                $project: {
                    users: 0,
                    // stocks: 0,
                    updatedusers: 0
                }
            },
        ]

        const warehouses = await this.warehouseModel.aggregate(aggregate)
        const all_categories = await this.categoryModel.find()
        const super_admins = await this.userModel.find({
            role: Role.SUPER_ADMIN
        })

        const super_admin_emails = await super_admins.map((ad) => {
            return ad.email
        })

        const processed_warehouses = await warehouses.map((warehouse) => {

            const category_info = all_categories.map((category) => {

                let total_dock_sale = 0
                let total_ware_sale = 0

                const total_added = warehouse.stocks.filter((val) => {
                    if(val.category === category.name){
                        return val
                    }
                })

                const total_sold = warehouse.stocks.filter((val) => {
                    if(val.category === category.name && !val.inStock){
                        return val
                    }
                })

                warehouse.dockyardcarts.filter((val) => {
                    val.items.map((itm) => {
                        if(itm.category === category.name){
                            total_dock_sale = total_dock_sale + (itm.price * itm.quantity)
                        }
                    })
                })

                warehouse.warehousecarts.filter((val) => {
                    val.items.map((itm) => {
                        if(itm.category === category.name){
                            total_ware_sale = total_ware_sale + itm.price
                        }
                    })
                })

                return {
                    category: category.name,
                    added: total_added.length,
                    sold: total_sold.length,
                    dock_total: total_dock_sale,
                    ware_total: total_ware_sale
                }

            })

            return {
                name: warehouse.identifier,
                currency: warehouse.currency,
                newUsers: warehouse.newUsers,
                updatedUsers: warehouse.updatedUsers,
                addedStock: warehouse.newStock,
                // stock: stock_info,
                categoryInfo: category_info,
                // wareTransactions: warehouse.warehousecarts
            }
        })

        let file = await { content: `
            <html style=" -webkit-print-color-adjust: exact;" lang="en">
                ${dailyReportHead(moment(new Date()).format('MMMM Do YYYY'))}
               ${
                    processed_warehouses.map((warehouse) => {
                        return `<page class="page">
                            ${dailyReportBody(warehouse)}
                        </page>`
                    })
                }
            </html>
        `}

        const output = await generatePdf(file, {
            format: 'A4'
        })

        await this.mailService.sendDailyReportEmail(super_admin_emails, moment(new Date()).format('MMMM Do YYYY'), output)

        return {
            message: "Daily report sent successfully",
            super_admins: super_admin_emails,
            warehouses: processed_warehouses
        }
    }

}
