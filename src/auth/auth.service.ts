import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/user.model';
import { AuthDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) {}

    async register(dto: AuthDto) {
        const newUser = new this.userModel(dto);
        return await newUser.save();
    }

    login() {
        return 'Signin';
    }
}
