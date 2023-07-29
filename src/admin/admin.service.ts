import mongoose from 'mongoose';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/auth/schemas/auth.schema';
import { Cart, Transaction } from 'src/sales/schemas/sales.schema';
import { Category, Inventory } from 'src/inventory/schemas/inventory.schema';
import { CreateCategoryDto } from 'src/inventory/dto/post.dto';
import { AddCurrencyDto } from './dto/post.dto';
import { customAlphabet } from 'nanoid';
import { Country } from './schemas/admin.schema';

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
        const { name, price } = payload
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
            price
        })

        return {
            message: "Successful"
        }
    }

    async getTransactions(
        page: number, limit: number, ref: string, status: string,
        location: string, warehouse: string
    ){
        const query = {
            "reference": { $regex: ref || "" },
            "status": { $regex: status || "" },
            "cart.sale_location": {$regex: location || ""},
            "cart.warehouse": {$regex: warehouse || ""},
        }
        const transactions = await this.transactionModel.find(query).sort( { "updatedAt": -1 } ).limit(limit || 10).skip(Number(page) > 0 ? (Number(page) - 1) * Number(limit) : 0)
        const total_transactions = await this.transactionModel.find(query).count()
        const number_of_pages = Math.ceil(total_transactions / Number(limit))
        return {
            data: transactions,
            total: total_transactions,
            pages: number_of_pages,
            next: Number(page) + 1 > number_of_pages ? "" : Number(page) + 1
        }
    }
}
