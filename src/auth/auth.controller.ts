import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GetUser } from './decorator';
import { AuthDto } from './dto';
import { JwtGuard } from './guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('local/register')
    @HttpCode(HttpStatus.CREATED)
    async registerLocal(@Body() dto: AuthDto) {
        return await this.authService.registerLocal(dto);
    }

    @Post('local/login')
    @HttpCode(HttpStatus.OK)
    async loginLocal(@Body() dto: AuthDto) {
        return await this.authService.loginLocal(dto);
    }

    @UseGuards(JwtGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@GetUser('id') userId: string) {
        return await this.authService.logout(userId);
    }

}
