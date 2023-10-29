import mongoose, { ObjectId, Types, isObjectIdOrHexString } from 'mongoose';
import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Role, User, Warehouse } from 'src/auth/schemas/auth.schema';
import { Cart, DockyardCart, Transaction } from 'src/sales/schemas/sales.schema';
import { Category, Inventory } from 'src/inventory/schemas/inventory.schema';
import { CreateCategoryDto } from 'src/inventory/dto/post.dto';
import { AddCurrencyDto, AddInventoryDto, DeleteMultipleInventoryDto, GenerateBarcodeDto, GetInventoryDto, GetInventoryReportDto, GetNotificationsDto, GetSalesReportDto, GetStatisticsDto, GetTransactionDto, GetTransactionOverviewDto, GetUsersDto, GetWarehouseDto } from './dto/post.dto';
import { customAlphabet } from 'nanoid';
import { Country, DailyReport, InventoryDeleteReport } from './schemas/admin.schema';
import { getDateRangeArray } from 'src/components/common/functions/common';
import * as moment from "moment";
import { BarcodeBody } from 'src/components/common/functions/barcode-templates';
import { generatePdf } from "html-pdf-node"
import { CreateWarehouseDto, RegisterUserDto } from 'src/auth/dto/post.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from 'src/notification/notification.service';
import { Notification, NotificationTag } from 'src/notification/schemas/notification.schema';
import { dailyReportBody, dailyReportHead } from 'src/components/common/functions/templates';
import { DailyReportBottomTable, NewDailyReportHead, DailyReportMainTable } from 'src/components/common/functions/report-template';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Cart.name)
        private cartModel: mongoose.Model<Cart>,
        @InjectModel(InventoryDeleteReport.name)
        private inventoryDeleteReportModel: mongoose.Model<InventoryDeleteReport>,
        @InjectModel(DailyReport.name)
        private dailyReportModel: mongoose.Model<DailyReport>,
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
            description: `${name} created`,
            warehouse: warehouseArr,
            role: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
            tag: NotificationTag.CATEGORY
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

        const invntry = await this.inventoryModel.findById(id)

        if(!invntry){
            throw new BadRequestException("Item does not exist.");
        }

        await this.inventoryModel.deleteOne({
            "_id": id
        })

        await this.inventoryDeleteReportModel.updateOne(
            {
                date: new Date().toLocaleDateString(),
                category: invntry.category,
                warehouse: invntry.warehouse
            },
            {
                $inc: { deletes: 1 }
            },
            { upsert: true }
        )

        return {
            message: "Successful"
        }
    }

    async deleteMultipleInventory(query: DeleteMultipleInventoryDto){

        const { category, number, warehouse } = query

        const cat = await this.categoryModel.findById(category)
        const warehouses = await this.warehouseModel.findOne({
            identifier: warehouse
        })

        if(!cat){
            throw new BadRequestException("Category does not exist");
        }
        if(!warehouses){
            throw new BadRequestException("Warehouse does not exist");
        }

        const deletable = await this.inventoryModel.aggregate([
            {
                $match: {
                    ghost: true,
                    inStock: true,
                    category: cat.name,
                    warehouse: warehouses.identifier
                }
            },
            {
                $project: {
                    uid: 1,
                    _id: 0
                }
            },
        ]).limit(Number(number))

        const deletableArr = await deletable.map((val) => {
            return val.uid
        })

        await this.inventoryModel.deleteMany({
            uid: { $in: deletableArr }
        })

        await this.inventoryDeleteReportModel.updateOne(
            {
                date: new Date().toLocaleDateString(),
                category: cat.name,
                warehouse: warehouses.identifier
            },
            {
                $inc: { deletes: deletableArr.length }
            },
            { upsert: true }
        )

        if(deletableArr.length){
            await this.notificationService.addNotification({
                title: 'Stock Deleted',
                description: `${deletableArr.length} ${cat.name} deleted from ${warehouses.identifier} inventory`,
                warehouse: [warehouses.identifier],
                role: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
                tag: NotificationTag.INVENTORY
            })
        }

        return {
            message: `${deletableArr.length} ${cat.name} deleted from inventory`
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
            {
                $lookup: {
                    from: "inventories",
                    localField: "name",
                    foreignField: "category",
                    pipeline: [
                        {   $match: {
                                inStock: true,
                                warehouse: {$regex: warehouse},
                                ghost: true
                            }
                        }
                    ],
                    as: "ghostitems"
                },
            },
            { $addFields: {
                stock: {$size: "$items"},
            }},
            { $addFields: {
                deletable_stock: {$size: "$ghostitems"},
            }},
            {
                $project: {
                    _id: 1,
                    name: 1,
                    code: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    stock: 1,
                    deletable_stock: 1,
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

    async getInventoryReport(query: GetInventoryReportDto){
        const months = ['JAN', 'FEB', 'MAR', 'APR',
            'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
        ]

        const { from, to, category } = query
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

        let inventory_overview = []

        for (var i = 0; i < dates.length - 1; i++){
            const total_inventory = await this.inventoryModel.find({
                category: category,
                warehouse: warehouse,
                createdAt:{$gte:new Date(dates[i]),$lt: new Date(dates[i + 1])}
            }).count()

            inventory_overview.push({
                total: total_inventory,
                year: new Date(dates[i]).getFullYear(),
                month: months[new Date(dates[i]).getMonth()]
            })

        }

        return {
            overview: inventory_overview
        }

    }

    async getSalesReport(payload: GetSalesReportDto){
        const { years, warehouse } = payload

        const yearsArr = JSON.parse(years)

        if(yearsArr.length > 3){
            throw new BadRequestException('Maximum of 3 years!');
        }

        if(yearsArr.length < 1){
            throw new BadRequestException('Minimum of one year!');
        }

        const today = new Date()

        const filter_years = yearsArr.filter((year) => {
            if(Number(year) < 2000 || Number(year) > today.getFullYear()){
                return year
            }
        })

        if(filter_years.length){
            throw new BadRequestException('Invalid year!');
        }

        let data = []

        for(var i = 0; i < yearsArr.length; i++){
            const query = {
                from: `${yearsArr[i]}-01`,
                to: `${yearsArr[i]}-12`,
                warehouse: warehouse
            }

            const transactionOverview = await this.getTransactionOverview(query)

            data.push({
                year: yearsArr[i],
                overview: transactionOverview.data.overview
            })
        }

        return {
            data: {
                report: data
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

    async addToInventory(user: User, payload: AddInventoryDto){

        const { category, quantity, warehouse } = payload

        const nanoid = customAlphabet(process.env.ALPHA_NUM_CAPS)

        const cat = await this.categoryModel.findById(category)
        const this_warehouse = await this.warehouseModel.findOne({
            identifier: warehouse
        })

        if(!cat){
            throw new BadRequestException("Category does not exists");
        }

        if(!this_warehouse){
            throw new BadRequestException("Warehouse does not exists");
        }

        let new_items = []

        for(var i = 0; i < quantity; i++){
            const ref = nanoid(7)
            new_items.push({
                uid: `${cat.code}-${ref}`,
                category: cat.name,
                creator: user._id,
                code: cat.code,
                ref: ref,
                warehouse: this_warehouse.identifier,
                inStock: true,
                ghost: true
            })
        }

        await this.inventoryModel.insertMany(new_items)

        await this.notificationService.addNotification({
            title: 'Stock Added',
            description: `${quantity} ${cat.name} added to the ${warehouse} inventory.`,
            warehouse: [warehouse],
            role: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
            tag: NotificationTag.INVENTORY
        })

        return {
            message: "Successful"
        }

    }


    // CRON JOBS
    // @Cron(CronExpression.EVERY_DAY_AT_10PM)
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

        await this.mailService.sendDailyReportEmail(
            // super_admin_emails,
            ["igbinedionpaul@gmail.com"],
            moment(new Date()).format('MMMM Do YYYY'),
            output
        )

        return {
            message: "Daily report sent successfully",
            super_admins: super_admin_emails,
            warehouses: processed_warehouses
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_10PM)
    async handleDailyReportNew() {
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

            // Total Inventories
            {
                $lookup: {
                    from: "inventories",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                inStock: true
                            }
                        }
                    ],
                    as: "totalstocks"
                },
            },

            // Total Inventories Sold Today
            {
                $lookup: {
                    from: "inventories",
                    localField: "identifier",
                    foreignField: "warehouse",
                    pipeline: [
                        {   $match: {
                                updatedAt: {$gte: today_start, $lt: today_end},
                                inStock: false
                            }
                        }
                    ],
                    as: "stocksoldtoday"
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
        const all_delete_reports = await this.inventoryDeleteReportModel.find({
            date: new Date().toLocaleDateString()
        })

        const yesterday_date = new Date()
        yesterday_date.setDate(yesterday_date.getDate() - 1)

        const yesterday_report = await this.dailyReportModel.findOne({
            date: yesterday_date.toLocaleDateString()
        })

        const super_admin_emails = await super_admins.map((ad) => {
            return ad.email
        })

        const processed_warehouses = await warehouses.map((warehouse) => {
            let total_warehouse_sales = 0
            let total_dockyard_sales = 0

            const yesterdayWarehouseReport = yesterday_report?.warehouses?.filter((warehouse_) => {
                if(warehouse_.name === warehouse.identifier){
                    return warehouse_
                }
            })

            const category_info = all_categories.map((category) => {

                let total_dock_sale_quantity = 0
                let total_dock_sale = 0

                let total_ware_sale = 0

                let yesterday_closing_inventory = "N/A"

                if(yesterdayWarehouseReport?.length){
                    const categoryReport = yesterdayWarehouseReport[0].categoryInfo
                    categoryReport.map((cat) => {
                        if(cat.category === category.name){
                            yesterday_closing_inventory = cat.total_stock.toString()
                        }
                    })

                }

                const deleted_stock = all_delete_reports.filter((val) => {
                    if(val.category === category.name && val.warehouse === warehouse.identifier){
                        return val
                    }
                })

                const total_available_stock = warehouse.totalstocks.filter((val) => {
                    if(val.category === category.name){
                        return val
                    }
                })

                const total_added = warehouse.stocks.filter((val) => {
                    if(val.category === category.name){
                        return val
                    }
                })

                const total_sold = warehouse.stocksoldtoday.filter((val) => {
                    if(val.category === category.name && !val.inStock){
                        return val
                    }
                })

                warehouse.dockyardcarts.filter((val) => {
                    val.items.map((itm) => {
                        if(itm.category === category.name){
                            total_dock_sale_quantity = total_dock_sale_quantity + itm.quantity
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

                total_warehouse_sales = total_warehouse_sales + total_ware_sale
                total_dockyard_sales = total_dockyard_sales + total_dock_sale

                return {
                    category: category.name,
                    added: total_added.length,
                    sold: total_sold.length,
                    total_stock: total_available_stock.length,
                    dock_sold: total_dock_sale_quantity,
                    dock_total: total_dock_sale,
                    ware_total: total_ware_sale,
                    deleted_total: deleted_stock.length ? deleted_stock[0].deletes : 0,
                    yesterday_closing_inventory
                }

            })

            return {
                name: warehouse.identifier,
                currency: warehouse.currency,
                newUsers: warehouse.newUsers,
                updatedUsers: warehouse.updatedUsers,
                addedStock: warehouse.newStock,

                total_warehouse_sales,
                total_dockyard_sales,

                // stock: stock_info,
                categoryInfo: category_info,
                // wareTransactions: warehouse.warehousecarts,
            }
        })

        let file = await { content: `
            <html style=" -webkit-print-color-adjust: exact;" lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Report</title>
                    <link rel="preload" as="style" href="https://fonts.cdnfonts.com/css/satoshi">
                </head>
                <body style="padding: 0; margin: 0;">
                    <div style="font-family: Satoshi, sans-serif; padding: 0; margin: 0;">
                    </div>
                </body>
                ${NewDailyReportHead(moment(new Date()).format('MMMM Do YYYY'))}
                ${
                    processed_warehouses.map((warehouse) => {
                        return `<page class="page">
                            ${DailyReportMainTable(warehouse)}
                            ${DailyReportBottomTable(warehouse)}
                        </page>`
                    })
                }
            </html>
        `}

        const output = await generatePdf(file, {
            format: 'Ledger',
            landscape: true,
        })

        await this.mailService.sendDailyReportEmail(
            super_admin_emails,
            // ["igbinedionpaul@gmail.com"],
            moment(new Date()).format('MMMM Do YYYY'),
            output
        )

        await this.dailyReportModel.updateOne(
            {
                date: new Date().toLocaleDateString()
            },
            {
                sent_to: super_admin_emails,
                warehouses: processed_warehouses
            },
            { upsert: true }
        )

        return {
            message: "Daily report sent successfully",
            super_admins: super_admin_emails,
            warehouses: processed_warehouses
        }
    }

}
