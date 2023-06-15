import {
    ConflictException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as argon from 'argon2';
import { Model } from 'mongoose';
import { User } from '../user/entities';
import { JWT_REFRESH_SECRET, JWT_SECRET } from './constants';
import { AuthDto } from './dto';
import { JwtPayLoad, Token } from './types';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private jwt: JwtService,
        private configService: ConfigService,
    ) {}

    async registerLocal(dto: AuthDto) {
        const emailTaken = await this.userModel.exists({ email: dto.email });
        if (emailTaken && dto.email) {
            throw new ConflictException('Email is already taken');
        }

        const hash = await argon.hash(dto.password);
        const newUser = new this.userModel({ ...dto, password: hash });
        const user = await newUser.save();

        const [sub, email] = [user._id.toString(), user.email];
        const tokens = await this.getTokens({
            sub,
            email,
        });
        await this.updateRtHash(sub, tokens.refresh_token);

        return tokens;
    }

    async loginLocal(dto: AuthDto) {
        const isValidLogin = await this.userModel.exists({
            email: dto.email,
        });
        if (!isValidLogin) {
            throw new ForbiddenException(
                'Invalid credentials: user does not exist',
            );
        }

        const { _id } = isValidLogin;
        const user = await this.userModel.findById(_id);

        const pwMatches = await argon.verify(user.password, dto.password);
        if (!pwMatches) {
            throw new ForbiddenException('Invalid password');
        }

        const [sub, email] = [user._id.toString(), user.email];
        const tokens = await this.getTokens({
            sub,
            email,
        });
        await this.updateRtHash(sub, tokens.refresh_token);

        return tokens;
    }

    private async updateRtHash(sub: string, refreshToken: string) {
        const hashedRefreshToken = await argon.hash(refreshToken);
        await this.userModel.findByIdAndUpdate(
            sub,
            { refresh_token: hashedRefreshToken },
        );
    }

    private async getTokens({
        sub,
        email,
    }: {
        sub: string;
        email: string;
    }): Promise<Token> {
        const jwtPayload: JwtPayLoad = {
            sub,
            email,
        };
        const [access_token, refresh_token] = await Promise.all([
            this.jwt.signAsync(jwtPayload, {
                expiresIn: '15m',
                secret: this.configService.get(JWT_SECRET),
            }),
            this.jwt.signAsync(jwtPayload, {
                expiresIn: '7d',
                secret: this.configService.get(JWT_REFRESH_SECRET),
            }),
        ]);
        return {
            access_token,
            refresh_token,
        };
    }
}
