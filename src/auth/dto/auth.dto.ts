import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsEmail()
    @IsNotEmpty()
    @IsOptional()
    email?: string;
}
