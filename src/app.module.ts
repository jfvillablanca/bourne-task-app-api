import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { mongooseConfig } from './config/database.config';
import { ProjectModule } from './project/project.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync(mongooseConfig()),
        AuthModule,
        ProjectModule,
        UserModule,
    ],
})
export class AppModule {}
