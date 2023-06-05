import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

const connectionString = 'mongodb://localhost:27017/bourne-task-app';

@Module({
    imports: [MongooseModule.forRoot(connectionString), AuthModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
