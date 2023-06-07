import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';

const connectionString = 'mongodb://localhost:27018/bourne-task-app';

@Module({
    imports: [MongooseModule.forRoot(connectionString), AuthModule],
})
export class AppModule {}
