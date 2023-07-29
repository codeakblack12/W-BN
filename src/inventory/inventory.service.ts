import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category, Inventory } from './schemas/inventory.schema';
import * as mongoose from 'mongoose';
import { User } from 'src/auth/schemas/auth.schema';
import { CreateCategoryDto } from './dto/post.dto';
import { customAlphabet } from 'nanoid';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class InventoryService {

    constructor(
        @InjectModel(Category.name)
        private categoryModel: mongoose.Model<Category>,
        @InjectModel(Inventory.name)
        private inventoryModel: mongoose.Model<Inventory>,
    ) {}

    async createCategory(payload: CreateCategoryDto){
        const { name } = payload
        const categories = await this.categoryModel.findOne({name: name.toLocaleLowerCase()})

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
            code: category_code
        })

        return {
            message: "Successful"
        }
    }

    async getCategories(){

        const categories = await this.categoryModel.find()

        return {
            data: categories
        }
    }

    async generateCodes(amt: number){

        return {
            amt
        }
    }

    async addOrRemove(id: string, type: "plus" | "minus", user: User){
        let payload

        if(type === "plus"){
            // CHECK IF ITEM SCANNED BEFORE
            const items = await this.inventoryModel.findOne({uid: id})
            if(items){
                throw new WsException("Item already added");
            }

            // CHECK CATEGORY EXISTS
            const item_arr = id.split("-")
            const categories = await this.categoryModel.findOne({code: item_arr[0]})
            if(!categories || item_arr.length < 2){
                throw new WsException("Invalid item!");
            }

            payload = {
                uid: id,
                creator: user._id,
                code: item_arr[0],
                ref: item_arr[1],
                category: categories.name,
            }

            // ADD TO INVENTORY
            const res = await this.inventoryModel.create({
                uid: id,
                creator: user._id,
                code: item_arr[0],
                ref: item_arr[1],
                category: categories.name,
                warehouse: user.warehouse[0],
                inStock: true
            })

            return res

        }else{
            // CHECK IF ITEM SCANNED BEFORE
            const items = await this.inventoryModel.findOne({uid: id})
            if(!items){
                throw new WsException("Item doesn't exist");
            }

            const res = await this.inventoryModel.findOneAndDelete({uid: id})

            return {
                message: `${id} ${"Removed"}`
            }
        }

    }

}
