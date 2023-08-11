import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose';
import { Role, User, Warehouse } from 'src/auth/schemas/auth.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Warehouse.name)
        private warehouseModel: mongoose.Model<Warehouse>,
        private jwtService: JwtService
    ) {}

    async getMe(request): Promise<User[]> {
        const users = await this.userModel.findOne({email: request.email})
        const user = users
        user.password = undefined
        let warehouses = []
        if(user.role.includes(Role.SUPER_ADMIN)){
            const all_warehouses = await this.warehouseModel.find()
            user.warehouse = all_warehouses.map((val) => {
                return val.identifier
            })
        }
        return user.toJSON()
    }
}
