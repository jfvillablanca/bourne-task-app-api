import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { AuthDTOStub } from '../../test/stubs';
import { User, UserSchema } from './entities';
import { UserService } from './user.service';

describe('UserService', () => {
    let userService: UserService;
    let mongod: MongoMemoryServer;
    let mongoConnection: Connection;
    let userModel: Model<User>;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        mongoConnection = (await connect(uri)).connection;
        userModel = mongoConnection.model(User.name, UserSchema);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getModelToken(User.name),
                    useValue: userModel,
                },
            ],
        }).compile();

        userService = module.get<UserService>(UserService);
    });

    afterAll(async () => {
        await mongoConnection.dropDatabase();
        await mongoConnection.close();
        await mongod.stop();
    });

    afterEach(async () => {
        const collections = mongoConnection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    it('should throw an error on non-existent user', async () => {
        const nonExistentUserId = new Types.ObjectId().toHexString();
        await expect(userService.getMe(nonExistentUserId)).rejects.toThrow(
            /User not found/,
        );
    });

    it('should get user details', async () => {
        const user = await new userModel(AuthDTOStub()).save();

        const getUser = await userService.getMe(user.id);
        expect(getUser.id).toBe(user.id);
        expect(getUser.email).toBe(user.email);
    });
});
