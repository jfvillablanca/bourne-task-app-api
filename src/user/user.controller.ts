import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUserId } from '../auth/decorator';
import { JwtGuard } from '../auth/guard';
import { UserService } from './user.service';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    getMe(@GetUserId() userId: string) {
        return this.userService.getMe(userId);
    }
}
