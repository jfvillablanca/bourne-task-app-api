import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorator';
import { JwtGuard } from '../auth/guard';
import { UserService } from './user.service';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    getMe(@GetUser('id') userId: string) {
        return this.userService.getMe(userId);
    }
}
