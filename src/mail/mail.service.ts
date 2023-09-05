import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor(private mailerService: MailerService) {}

    async sendWelcomeEmail(email: string, password: string){
        await this.mailerService.sendMail({
            to: email,
            subject: "Welcome to Wusuaa",
            template: "./welcome",
            context: {
                email: email,
                password: password
            }
        })
    }

    async sendPasswordResetEmail(email: string, name: string, link: string){
        await this.mailerService.sendMail({
            to: email,
            subject: "Reset Wusuaa Password",
            template: "./resetpassword",
            context: {
                name: name,
                link: link
            }
        })
    }
}
