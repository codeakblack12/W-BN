import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { LoginUserDto, RegisterUserDto, CreateWarehouseDto, ResetPasswordDto, ConfirmResetPasswordDto  } from './dto/post.dto';
import { JwtService } from '@nestjs/jwt'
import { customAlphabet } from 'nanoid';
import { hasher } from 'lib/hasher';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Reset, Role, User, Warehouse } from './schemas/auth.schema';
import * as mongoose from 'mongoose';
import { jwtConstants } from './constants';
import { Country } from 'src/admin/schemas/admin.schema';
import { MailService } from 'src/mail/mail.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationTag } from 'src/notification/schemas/notification.schema';


@Injectable()
export class AuthService {

    constructor(
        @InjectModel(User.name)
        private userModel: mongoose.Model<User>,
        @InjectModel(Warehouse.name)
        private warehouseModel: mongoose.Model<Warehouse>,
        @InjectModel(Country.name)
        private countryModel: mongoose.Model<Country>,
        @InjectModel(Reset.name)
        private resetModel: mongoose.Model<Reset>,
        private mailService: MailService,
        private notificationService: NotificationService,
        private jwtService: JwtService,
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
            currency: countryExists.currency,
            active: true
        })

        await this.notificationService.addNotification({
            title: 'Warehouse Created',
            description: `${payload.identifier} was just created`,
            warehouse: [],
            role: [Role.SUPER_ADMIN],
            tag: NotificationTag.WAREHOUSE
        })

        return {
            message: "Successful"
        }
    }

    // USERS

    async registerUser(payload: RegisterUserDto, user: User){
        // Check if user exists
        const users = await this.userModel.findOne({email: payload.email.toLowerCase()})
        if(users){
            throw new BadRequestException("Email has been used by another user");
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

        const res = await this.userModel.create({
            ...payload,
            email: payload.email.toLowerCase(),
            password: hashed_password,
            active: false,
            disabled: false
        })

        await this.mailService.sendWelcomeEmail(payload.email, generatedPassword)

        await this.notificationService.addNotification({
            title: 'New User',
            description: `${payload.firstName} ${payload.lastName} has been added to the team`,
            warehouse: payload.warehouse,
            role: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
            tag: NotificationTag.USER
        })

        return {
            message: "Successful"
        }
    }

    async loginUser(payload: LoginUserDto){
        // Check if user exists
        const user = await this.userModel.findOne({email: payload.email.toLowerCase(), disabled: false})
        if(!user){
            throw new UnauthorizedException("User does not exist");
        }

        const hashed_password = hasher(payload.password)

        if(hashed_password !== user?.password){
            throw new UnauthorizedException("Password incorrect")
        }

        if(
            payload.platform === "WEB" &&
            !user.role.includes(Role.SUPER_ADMIN) && !user.role.includes(Role.ADMIN) && !user.role.includes(Role.MANAGER)
        ){
            throw new UnauthorizedException("You cannot access this platform!")
        }

        if(
            payload.platform === "DESKTOP" &&
            !user.role.includes(Role.SUPER_ADMIN) && !user.role.includes(Role.ADMIN) && !user.role.includes(Role.MANAGER) &&
            !user.role.includes(Role.SALES)
        ){
            throw new UnauthorizedException("You cannot access this platform!")
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
            await this.notificationService.addNotification({
                title: `Account activated`,
                description: `${user.firstName} ${user.lastName} has activated his/her account.`,
                warehouse: user.warehouse,
                role: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
                tag: NotificationTag.USER
            })
        }

        const token = {
            ...user_,
            platform: payload.platform
        }

        return {
            access_token: await this.jwtService.signAsync(token)
        }
    }

    async resetPassword(payload: ResetPasswordDto){

        const MAX_DAYS = 1

        const user = await this.userModel.findOne({email: payload.email.toLowerCase(), disabled: false})

        if(!user){
            throw new UnauthorizedException("User does not exist");
        }

        // Create a Password Reset Document with the users Id
        const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz012345789')
        const generatedToken = nanoid(15);

        await this.resetModel.create({
            user: user._id,
            token: generatedToken,
            active: true,
            expireAt: new Date(Date.now() + MAX_DAYS * 24 * 60 * 60 * 1000)
        })

        await this.mailService.sendPasswordResetEmail(
            payload.email,
            user.firstName,
            `${process.env.WUSUAA_BASE_URL}/auth/reset-password?token=${generatedToken}`
        )

        return {
            message: "Successful"
        }

    }

    async confirmResetPassword(payload: ConfirmResetPasswordDto){

        // Get Token if exists and is valid
        const resetToken = await this.resetModel.findOne({
            token: payload.token,
            active: true,
            expireAt: { $gt: new Date() }
        })

        if(!resetToken){
            throw new UnauthorizedException("Invalid reset token");
        }

        const hashed_password = await hasher(payload.password)

        await this.userModel.findOneAndUpdate(
            { '_id': resetToken.user },
            {
                '$set': {password: hashed_password }
            }
        )

        await this.resetModel.findOneAndUpdate(
            { '_id': resetToken._id },
            {
                '$set': {active: false }
            }
        )

        return {
            message: "Successful"
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
