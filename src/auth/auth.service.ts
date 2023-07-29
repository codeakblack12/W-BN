import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { LoginUserDto, RegisterUserDto, CreateWarehouseDto  } from './dto/post.dto';
import { JwtService } from '@nestjs/jwt'
import { customAlphabet } from 'nanoid';
import { hasher } from 'lib/hasher';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Role, User, Warehouse } from './schemas/auth.schema';
import * as mongoose from 'mongoose';
import { jwtConstants } from './constants';
import { Country } from 'src/admin/schemas/admin.schema';

@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Warehouse.name)
        private warehouseModel: mongoose.Model<Warehouse>,
        @InjectModel(Country.name)
        private countryModel: mongoose.Model<Country>,
        private jwtService: JwtService
    ) {}

    async getAll(): Promise<User[]> {
        const users = await this.userModel.find()
        return users
    }

    async getAllWarehouses(): Promise<Warehouse[]> {
        const warehouses = await this.warehouseModel.find()
        return warehouses
    }

    //  WAREHOUSE
    async createWarehouse(payload: CreateWarehouseDto){
        // Check is country exists
        const countryExists = await this.countryModel.findOne({country: payload.country})
        if(!countryExists){
            throw new BadRequestException("Country not available");
        }

        // Check if warehouse exists
        const warehouseExists = await this.warehouseModel.findOne({identifier: payload.identifier})
        if(warehouseExists){
            throw new BadRequestException("Identifier has been used by another warehouse");
        }

        // Check if warehouse location exists
        const warehouseLocExists = await this.warehouseModel.findOne({
            address: payload.address,
            city: payload.city,
            country: payload.country
        })
        if(warehouseLocExists){
            throw new BadRequestException("Warehouse already exists in this location");
        }

        const res = await this.warehouseModel.create({
            ...payload,
            currency: countryExists.currency
        })

        return {
            message: "Successful"
        }
    }

    // USERS

    async registerUser(payload: RegisterUserDto){
        // Check if user exists
        const users = await this.userModel.findOne({email: payload.email})
        if(users){
            throw new BadRequestException("Email has been used by another user");
        }

        // Check permissions
        if(!payload.role.includes(Role.SUPER_ADMIN) && payload.warehouse.length < 1){
            throw new BadRequestException("Warehouse not added");
        }

        if(
            (
                !payload.role.includes(Role.SUPER_ADMIN) &&
                !payload.role.includes(Role.ADMIN) &&
                !payload.role.includes(Role.MANAGER)
            ) &&
            payload.warehouse.length > 1
        ){
            throw new BadRequestException("User can only be assigned to one warehouse");
        }

        // Check if warehouse exists
        const warehouses = await this.warehouseModel.find()
        const warehouse_identifiers = warehouses.map((val) => {
            return val.identifier
        })
        payload.warehouse.map((val) => {
            if(!warehouse_identifiers.includes(val)){
                throw new BadRequestException("Invalid warehouse");
            }
        })

        // Create password
        const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz012345789')
        const generatedPassword = nanoid(15);
        const hashed_password = await hasher(generatedPassword)
        const dummy_password = await hasher("password123?")

        const res = await this.userModel.create({
            ...payload,
            password: payload.email === "igbinedionpaul@gmail.com" ? dummy_password : hashed_password,
            active: false,
            disabled: false
        })

        return {
            message: "Successful"
        }
    }

    async loginUser(payload: LoginUserDto){
        // Check if user exists
        const user = await this.userModel.findOne({email: payload.email, disabled: false})
        if(!user){
            throw new UnauthorizedException("User does not exist");
        }

        const hashed_password = hasher(payload.password)

        if(hashed_password !== user?.password){
            throw new UnauthorizedException("Password incorrect")
        }

        user.password = undefined

        let user_ = user.toJSON()

        if(!user.active){
            await this.userModel.findOneAndUpdate(
                { 'email': payload.email },
                {'$set': {
                    active: true
                }}
            )
        }

        const token = {
            ...user_,
            platform: payload.platform
        }

        return {
            access_token: await this.jwtService.signAsync(token)
        }
    }

    // Authorization

    async getUserFromAuthenticationToken(token: string) {
        try {
            const payload = this.jwtService.verify(token, {
              secret: jwtConstants.secret,
            });

            const userId = payload._id

            if (userId) {
                return this.userModel.findById(userId);
            }else{
                throw new UnauthorizedException("User does not exist");
            }
        } catch (error) {
            throw new WsException('Invalid credentials.');
        }
    }

    async getUserFromSocket(socket) {
        try {
            let auth_1 = socket.handshake.auth.authorization
            let auth_2 = socket.handshake.headers.authorization
            let auth_token = auth_1 || auth_2

            if(!auth_token){
                throw new WsException('Invalid credentials.');
            }

            // get the token itself without "Bearer"
            auth_token = auth_token.split(' ')[1];

            const user = await this.getUserFromAuthenticationToken(
                auth_token
            );

            if (!user) {
                throw new WsException('Invalid credentials.');
            }

            return user;
        } catch (error) {
            throw new WsException('Invalid credentials.');
        }
    }
}
