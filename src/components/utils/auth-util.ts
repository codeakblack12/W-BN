import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { jwtConstants } from 'src/auth/constants';

export const verifyAuthToken = function (
    token: string,
    ): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
        jwt.verify(
        token,
        jwtConstants.secret,
        async (err, decoded: jwt.JwtPayload) => {
            if (err) {
            console.log(err);
            reject(new UnauthorizedException());
            } else {
            if (!decoded.user) reject(new UnauthorizedException());
            resolve(decoded);
            }
        },
        );
    });
};
