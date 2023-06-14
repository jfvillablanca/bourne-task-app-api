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
import { JWT_SECRET } from './constants';
import { AuthDto } from './dto';

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

        return this.signToken({
            sub: user._id.toString(),
            email: user.email,
        });
    }

    async loginLocal(dto: AuthDto) {
        const isValidLogin = await this.userModel.exists({
            email: dto.email,
        });
        if (!isValidLogin) {
            throw new ForbiddenException('Invalid credentials');
        }

        const { _id } = isValidLogin;
        const user = await this.userModel.findById(_id);

        const pwMatches = await argon.verify(user.password, dto.password);
        if (!pwMatches) {
            throw new ForbiddenException('Invalid password');
        }

        return this.signToken({
            sub: user._id.toString(),
            email: user.email,
        });
    }

    async signToken({
        sub,
        email,
    }: {
        sub: string;
        email: string;
    }): Promise<{ access_token: string }> {
        const payload = {
            sub,
            email,
        };
        const token = await this.jwt.signAsync(payload, {
            expiresIn: '15m',
            secret: this.configService.get(JWT_SECRET),
        });

        return {
            access_token: token,
        };
    }
}
