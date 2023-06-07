import {
    ConflictException,
    ForbiddenException,
    Injectable
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon from 'argon2';
import { Model } from 'mongoose';
import { User } from '../user/user.model';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) {}

    async register(dto: RegisterDto) {
        const usernameTaken = await this.userModel.exists({
            username: dto.username,
        });
        if (usernameTaken) {
            throw new ConflictException('Username is already taken');
        }

        const emailTaken = await this.userModel.exists({ email: dto.email });
        if (emailTaken && dto.email) {
            throw new ConflictException('Email is already taken');
        }

        const hash = await argon.hash(dto.password);
        const newUser = new this.userModel({ ...dto, password: hash });
        const document = await newUser.save();
        const { password, ...result } = document.toObject({
            versionKey: false,
        });
        void password;
        return result;
    }

    async login(dto: LoginDto) {
        const isValidLoginByUsername = await this.userModel.exists({
            username: dto.usernameOrEmail,
        });
        const isValidLoginByEmail = await this.userModel.exists({
            email: dto.usernameOrEmail,
        });
        if (!isValidLoginByUsername || !isValidLoginByEmail) {
            throw new ForbiddenException('Invalid credentials');
        }
    }
}
