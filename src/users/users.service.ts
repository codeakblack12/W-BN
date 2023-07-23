import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/auth/schemas/auth.schema';
import * as mongoose from 'mongoose';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        private jwtService: JwtService
    ) {}

    async getMe(request): Promise<User[]> {
        const users = await this.userModel.findOne({email: request.email})
        const user = users
        user.password = undefined
        return user.toJSON()
    }
}
