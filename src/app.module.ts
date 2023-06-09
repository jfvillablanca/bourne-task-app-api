import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { mongooseConfig } from './config/database.config';
import { UserController } from './user/user.controller';
import { ProjectModule } from './project/project.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync(mongooseConfig()),
        AuthModule,
        ProjectModule,
    ],
    controllers: [UserController],
})
export class AppModule {}
