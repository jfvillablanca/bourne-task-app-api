import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/user.model';
import { AuthDto } from './dto';
import * as argon from 'argon2';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) {}

    async register(dto: AuthDto) {
        const hash = await argon.hash(dto.password);
        const newUser = new this.userModel({ ...dto, password: hash });
        const document = await newUser.save();
        const { password, ...result } = document.toObject({
            versionKey: false,
        });
        void password;
        return result;
    }

    login() {
        return 'Signin';
    }
}
