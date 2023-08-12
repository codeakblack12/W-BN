import mongoose from 'mongoose';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Role, User, Warehouse } from 'src/auth/schemas/auth.schema';
import { Cart, Transaction } from 'src/sales/schemas/sales.schema';
import { Category, Inventory } from 'src/inventory/schemas/inventory.schema';
import { CreateCategoryDto } from 'src/inventory/dto/post.dto';
import { AddCurrencyDto, GetInventoryDto, GetStatisticsDto, GetTransactionDto, GetTransactionOverviewDto, GetUsersDto, GetWarehouseDto } from './dto/post.dto';
import { customAlphabet } from 'nanoid';
import { Country } from './schemas/admin.schema';
import { getDateRangeArray } from 'src/components/common/functions/common';
import moment from 'moment';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Cart.name)
        private cartModel: mongoose.Model<Cart>,
        @InjectModel(Inventory.name)
        private inventoryModel: mongoose.Model<Inventory>,
        @InjectModel(Category.name)
        private categoryModel: mongoose.Model<Category>,
        @InjectModel(Country.name)
        private countryModel: mongoose.Model<Country>,
        @InjectModel(Transaction.name)
        private transactionModel: mongoose.Model<Transaction>,
        @InjectModel(Warehouse.name)
        private warehouseModel: mongoose.Model<Warehouse>,

    ){}

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

    async getCountries(){

        const countries = await this.countryModel.find()

        return {
            data: countries
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

        const nanoid = customAlphabet(name.toLowerCase())

        const category_code = `${name[0].toLowerCase()}${nanoid(2)}`

        const category_codes = await this.categoryModel.findOne({code: category_code})

        if(category_codes){
            throw new BadRequestException("Seems something went wrong, please try again.");
        }

        const res = await this.categoryModel.create({
            name: name.toLocaleLowerCase(),
            code: category_code,
            price,
            stockThreshold
        })

        return {
            message: "Successful"
        }
    }

    async getTransactions(
        page: number, limit: number, ref: string, status: string,
        location: string, warehouse: string
    ){
        const page_ = page || 1
        const limit_ = limit || 10

        const query = {
            "reference": { $regex: ref || "" },
            "status": { $regex: status || "" },
            "cart.sale_location": {$regex: location || ""},
            "cart.warehouse": {$regex: warehouse || ""},
        }
        const transactions = await this.transactionModel.find(query).sort( { "updatedAt": -1 } ).skip(Number(page_) > 0 ? (Number(page_) - 1) * Number(limit_) : 0).limit(limit_)
        const total_transactions = await this.transactionModel.find(query).count()
        const number_of_pages = Math.ceil(total_transactions / Number(limit_))
        return {
            data: transactions,
            total: total_transactions,
            pages: number_of_pages,
            next: Number(page) + 1 > number_of_pages ? "" : Number(page_) + 1
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
                    name: {$regex: name},
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

        const find_query = {
            category: category,
            warehouse: warehouse,
            inStock: true
        }

        const inventory = await this.inventoryModel.find(find_query)
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
            'INVENTORY': 'Inventory Manager',
            'SALES': 'Sales',
            'SECURITY': 'Securty'
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
            } },
            {$group: {_id: null, gross_sales:{$sum:"$amount"}}}
        ])

        const total_sales = gross_sales[0]?.gross_sales || 0

        const aggregate = [
            // {$sort: { "name": 1 }},
            {
                $lookup: {
                    from: "inventories",
                    localField: "name",
                    foreignField: "category",
                    pipeline: [
                        {   $match: {inStock: false, warehouse: {$regex: warehouse}}}
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

        const items = await this.categoryModel.aggregate(aggregate)

        return {
            data: {
                stock: {
                    total: all_stocks,
                    total_sold: all_out_of_stock,
                    percentage_sold: all_out_of_stock_percentage || 0,
                    total_sold_today: all_stocks_sold_today,
                    percentage_sold_today: all_sold_today_percentage || 0
                },
                sales: {
                    total: total_sales,
                    total_sold: all_out_of_stock,
                    items
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
}
