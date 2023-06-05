import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto';

@Controller()
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    async register(@Body() dto: AuthDto) {
        return await this.authService.register(dto);
    }

    @Post('login')
    login() {
        return this.authService.login();
    }
}
