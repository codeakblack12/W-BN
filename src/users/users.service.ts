import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose';
import { Role, User, Warehouse } from 'src/auth/schemas/auth.schema';
import * as mongoose from 'mongoose';
import { ChangePasswordDto, UpdateMeDto } from './dto/post.dto';
import { hasher } from 'lib/hasher';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Warehouse.name)
        private warehouseModel: mongoose.Model<Warehouse>,
        private jwtService: JwtService,
        private notificationService: NotificationService,
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

        await this.userModel.findOneAndUpdate(
            { 'email': request.email },
            {'$set': {
                lastActive: new Date()
            }}
        )

        return user.toJSON()
    }

    async updateMe(user: User, payload: UpdateMeDto) {
        await this.userModel.findByIdAndUpdate(
            {_id: user._id},
            {
                firstName: payload.firstName,
                lastName: payload.lastName,
                email: payload.email
            }
        )
        return {
            message: "Successful"
        }
    }

    async changePassword(user: User, payload: ChangePasswordDto) {
        const { oldPassword, newPassword } = payload

        const user_info = await this.userModel.findById(user._id)

        if(!user_info){
            throw new UnauthorizedException("User does not exist")
        }

        const hashed_old_password = hasher(oldPassword)
        const hashed_new_password = hasher(newPassword)

        if(hashed_old_password !== user_info.password){
            throw new UnauthorizedException("Incorrect old password")
        }

        await this.userModel.findByIdAndUpdate(
            {_id: user._id},
            {
                password: hashed_new_password
            }
        )

        return {
            message: "Successful"
        }
    }
}
