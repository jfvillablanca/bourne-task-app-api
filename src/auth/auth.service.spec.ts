import {
    ConflictException,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon from 'argon2';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { AuthDTOStub } from '../../test/stubs';
import { User, UserSchema } from '../user/entities';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let mongod: MongoMemoryServer;
    let mongoConnection: Connection;
    let userModel: Model<User>;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        mongoConnection = (await connect(uri)).connection;
        userModel = mongoConnection.model(User.name, UserSchema);

        const module: TestingModule = await Test.createTestingModule({
            imports: [JwtModule, ConfigModule],
            providers: [
                AuthService,
                {
                    provide: getModelToken(User.name),
                    useValue: userModel,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: (key: string) => key,
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
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

    describe('Register Local JWT', () => {
        it('should throw an error if email is already taken', async () => {
            const dto = { ...AuthDTOStub(), email: 'registered@email.com' };
            await service.registerLocal(dto);
            await expect(service.registerLocal(dto)).rejects.toThrow(
                new ConflictException('Email is already taken'),
            );
        });

        it('should return access and refresh token if successful registration', async () => {
            const tokens = await service.registerLocal(AuthDTOStub());
            expect(tokens.access_token).toBeDefined();
            expect(tokens.refresh_token).toBeDefined();
        });

        it('should automatically authenticate when a new user registers with a refresh_token in database', async () => {
            const dto = { ...AuthDTOStub(), password: '1234' };
            const hashedRefreshToken = 'hashed_refresh_token';
            const originalArgonHash = argon.hash;
            jest.spyOn(argon, 'hash').mockImplementation(
                async (data: string) => {
                    if (data === dto.password) {
                        return originalArgonHash(data);
                    } else {
                        return Promise.resolve(hashedRefreshToken);
                    }
                },
            );
            await service.registerLocal(dto);

            const registeredUser = await userModel
                .findOne({ refresh_token: hashedRefreshToken })
                .exec();

            expect(registeredUser.refresh_token).toBeDefined();
            expect(registeredUser.refresh_token).toBe(hashedRefreshToken);
        });
    });

    describe('Login Local JWT', () => {
        beforeEach(() => {
            jest.spyOn(argon, 'hash').mockReset();
        });

        it('should throw an error if user does not exist', async () => {
            await expect(service.loginLocal(AuthDTOStub())).rejects.toThrow(
                new ForbiddenException(
                    'Invalid credentials: user does not exist',
                ),
            );
        });

        it('should return access and refresh token if successful login', async () => {
            await service.registerLocal(AuthDTOStub());
            const tokens = await service.loginLocal(AuthDTOStub());
            expect(tokens.access_token).toBeDefined();
            expect(tokens.refresh_token).toBeDefined();
        });

        it('should automatically authenticate when a user logs in with a refresh_token in database', async () => {
            const dto = { ...AuthDTOStub(), password: '1234' };
            const hashedRefreshToken = 'hashed_refresh_token';
            const originalArgonHash = argon.hash;
            await service.registerLocal(dto);
            jest.spyOn(argon, 'hash').mockImplementation(
                async (data: string) => {
                    if (data === dto.password) {
                        return originalArgonHash(data);
                    } else {
                        return Promise.resolve(hashedRefreshToken);
                    }
                },
            );

            await service.loginLocal(dto);

            const loggedInUser = await userModel
                .findOne({ refresh_token: hashedRefreshToken })
                .exec();

            expect(loggedInUser.refresh_token).toBeDefined();
            expect(loggedInUser.refresh_token).toBe(hashedRefreshToken);
        });
    });

    describe('Logout', () => {
        const mockedHashedRt = 'hashed_refresh_token';

        beforeEach(async () => {
            jest.spyOn(argon, 'hash').mockReset();

            const dto = { ...AuthDTOStub(), password: '1234' };
            const originalArgonHash = argon.hash;
            await service.registerLocal(dto);
            jest.spyOn(argon, 'hash').mockImplementationOnce(
                async (data: string) => {
                    if (data === dto.password) {
                        return originalArgonHash(data);
                    } else {
                        return Promise.resolve(mockedHashedRt);
                    }
                },
            );
            await service.loginLocal(dto);
        });

        it('should nullify the refresh token of selected authenticated user', async () => {
            const { _id: userId, refresh_token: rtBeforeLogOut } =
                await userModel
                    .findOne({ refresh_token: mockedHashedRt })
                    .exec();

            await service.logout(userId.toString());
            const { refresh_token: rtAfterLogOut } = await userModel.findById(
                userId,
            );

            expect(rtBeforeLogOut).toBe(mockedHashedRt);
            expect(rtAfterLogOut).toBeNull();
        });
    });

    describe('Refresh', () => {
        const mockedHashedRt = 'hashed_refresh_token';
        let rtBeforeRefresh: string;
        let existingUserId: string;

        beforeEach(async () => {
            jest.spyOn(argon, 'hash').mockReset();

            const dto = { ...AuthDTOStub(), password: '1234' };
            const originalArgonHash = argon.hash;
            await service.registerLocal(dto);
            jest.spyOn(argon, 'hash').mockImplementationOnce(
                async (data: string) => {
                    if (data === dto.password) {
                        return originalArgonHash(data);
                    } else {
                        return Promise.resolve(mockedHashedRt);
                    }
                },
            );
            const tokens = await service.loginLocal(dto);
            rtBeforeRefresh = tokens.refresh_token;

            const existingUser = await userModel
                .findOne({ refresh_token: mockedHashedRt })
                .exec();
            existingUserId = existingUser._id.toString();
        });

        it('should throw an error if user does not exist', async () => {
            const nonExistentId = new Types.ObjectId(1).toString();

            await expect(
                service.refreshTokens(nonExistentId, 'fake-refresh-token'),
            ).rejects.toThrow(new UnauthorizedException('User does not exist'));
        });

        it('should throw an error if refresh is requested by a logged out user', async () => {
            await service.logout(existingUserId);

            await expect(
                service.refreshTokens(existingUserId, rtBeforeRefresh),
            ).rejects.toThrow(
                new ForbiddenException('Cannot refresh when logged out'),
            );
        });

        it('should throw an error if refresh token mismatches or blacklisted', async () => {
            jest.spyOn(argon, 'verify').mockResolvedValueOnce(false);

            await expect(
                service.refreshTokens(existingUserId, rtBeforeRefresh),
            ).rejects.toThrow(new ForbiddenException('Access Denied'));
        });

        it('should generate a new refresh token and return it', async () => {
            const newRefreshToken = 'new_refresh_token';
            jest.spyOn(argon, 'verify').mockResolvedValueOnce(true);
            jest.spyOn(service, 'refreshTokens').mockResolvedValueOnce({
                access_token: 'new_access_token',
                refresh_token: newRefreshToken,
            });

            const refreshedTokens = await service.refreshTokens(
                existingUserId,
                rtBeforeRefresh,
            );

            expect(refreshedTokens).toEqual({
                access_token: 'new_access_token',
                refresh_token: newRefreshToken,
            });
        });
    });
});
