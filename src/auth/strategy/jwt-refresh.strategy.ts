import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwt_refresh, JWT_REFRESH_SECRET } from '../constants';
import { JwtPayLoad, JwtPayloadWithRt } from '../types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    jwt_refresh,
) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get(JWT_REFRESH_SECRET),
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: JwtPayLoad): JwtPayloadWithRt {
        const refreshToken = req
            ?.get('authorization')
            ?.replace('Bearer', '')
            .trim();
        if (!refreshToken)
            throw new ForbiddenException('Refresh token malformed');
        return {
            ...payload,
            refresh_token: refreshToken,
        };
    }
}
