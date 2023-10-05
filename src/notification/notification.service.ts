import { Injectable } from '@nestjs/common';
import { Notification } from './schemas/notification.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Injectable()
export class NotificationService {

    constructor(
        @InjectModel(Notification.name)
        private notificationModel: mongoose.Model<Notification>
    ) {}

    async addNotification(notification: Notification){

        await this.notificationModel.create(notification)

    }

}
