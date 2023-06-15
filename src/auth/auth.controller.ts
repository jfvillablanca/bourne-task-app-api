import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GetRefreshToken, GetUser } from './decorator';
import { AuthDto } from './dto';
import { JwtGuard, JwtGuardRefresh } from './guard';
import { JwtPayloadWithRt } from './types';

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

    @UseGuards(JwtGuardRefresh)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshTokens(@GetRefreshToken() body: JwtPayloadWithRt) {
        const { sub: userId, refresh_token: refreshToken } = body;
        return await this.authService.refreshTokens(userId, refreshToken);
    }
}
