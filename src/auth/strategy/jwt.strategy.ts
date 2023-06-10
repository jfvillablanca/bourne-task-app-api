import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Document, Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../user/entities';
import { jwt, JWT_SECRET } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, jwt) {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get(JWT_SECRET),
        });
    }

    private dropPassword(user: Document) {
        const { password, ...noPasswordField } = user.toObject({
            versionKey: false,
        });
        void password;
        return noPasswordField;
    }

    async validate(payload: { sub: string; username: string }) {
        const user = await this.userModel.findById(payload.sub);
        return this.dropPassword(user);
    }
}
