import { ConflictException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model } from 'mongoose';
import { LoginDTOStub, RegisterDTOStub } from '../../test/stubs/auth.dto.stub';
import { User, UserSchema } from '../user/user.model';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
    let authController: AuthController;
    let mongod: MongoMemoryServer;
    let mongoConnection: Connection;
    let userModel: Model<User>;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        mongoConnection = (await connect(uri)).connection;
        userModel = mongoConnection.model(User.name, UserSchema);

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                AuthService,
                { provide: getModelToken(User.name), useValue: userModel },
            ],
        }).compile();

        authController = module.get<AuthController>(AuthController);
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

    describe('/register', () => {
        it('should return the username and email of the created user', async () => {
            const createdUser = await authController.register(
                RegisterDTOStub(),
            );
            expect(createdUser.username).toBe(RegisterDTOStub().username);
            expect(createdUser.email).toBe(RegisterDTOStub().email);
        });

        it('should allow registration without an email', async () => {
            const authDTOStub = RegisterDTOStub();
            delete authDTOStub.email;

            const createdUser = await authController.register(authDTOStub);

            expect(createdUser.username).toBe(authDTOStub.username);
            expect(createdUser.email).toBeUndefined();
            expect(createdUser._id).toBeDefined();
        });

        it('should throw an error if the username is already taken', async () => {
            await new userModel({
                ...RegisterDTOStub(),
                username: 'unique_username',
            }).save();
            await expect(
                authController.register(RegisterDTOStub()),
            ).rejects.toThrow(new ConflictException('Email is already taken'));
        });

        it('should throw an error if the email is invalid', async () => {
            await new userModel({
                ...RegisterDTOStub(),
                email: 'unique_email',
            }).save();
            await expect(
                authController.register(RegisterDTOStub()),
            ).rejects.toThrow(
                new ConflictException('Username is already taken'),
            );
        });
    });
    describe('/login', () => {
        it('should throw an exception if username or email does not exist', async () => {
            await expect(
                authController.login(LoginDTOStub({ useEmail: true })),
            ).rejects.toThrow(new ForbiddenException('Invalid credentials'));

            await expect(authController.login(LoginDTOStub())).rejects.toThrow(
                new ForbiddenException('Invalid credentials'),
            );
        });
    });
});
