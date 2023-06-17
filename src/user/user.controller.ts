import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUserId } from '../auth/decorator';
import { JwtGuard } from '../auth/guard';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
    @Get('me')
    getMe(@GetUserId() userId: string) {
    }
}
