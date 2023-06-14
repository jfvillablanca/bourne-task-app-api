import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';

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
}
