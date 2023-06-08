import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';
import { DB_URI } from './constants';

export const mongooseConfig = (): MongooseModuleAsyncOptions => {
    return {
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => {
            return {
                uri: configService.get(DB_URI),
            };
        },
        inject: [ConfigService],
    };
};
