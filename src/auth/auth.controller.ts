import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto';

@Controller()
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return await this.authService.register(dto);
    }

    @Post('login')
    login() {
        return this.authService.login();
    }
}
