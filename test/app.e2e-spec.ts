import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { CreateProjectDto } from '../src/project/dto';
import { AppModule } from './../src/app.module';
import { CreateProjectDTOStub, LoginDTOStub, RegisterDTOStub } from './stubs';

describe('AppController (e2e)', () => {
    let app: INestApplication;
    let mongoConnection: Connection;
    const port = 3333;
    const baseUrl = `http://localhost:${port}`;

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
            }),
        );
        await app.init();
        await app.listen(port);

        mongoConnection = await app.resolve(getConnectionToken());

        pactum.request.setBaseUrl(baseUrl);
    });

    afterAll(() => {
        app.close();
    });

    afterEach(async () => {
        const collections = mongoConnection.collections;
        for (const key in collections) {
            const collection = collections[key];
            await collection.deleteMany({});
        }
    });

    describe('Auth', () => {
        describe('register', () => {
            it('should throw an error if username is empty during registration', () => {
                return pactum
                    .spec()
                    .post('/register')
                    .withBody({ ...RegisterDTOStub(), username: '' })
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should throw an error if email is empty during registration', () => {
                return pactum
                    .spec()
                    .post('/register')
                    .withBody({ ...RegisterDTOStub(), email: '' })
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should throw an error if password is empty during registration', () => {
                return pactum
                    .spec()
                    .post('/register')
                    .withBody({ ...RegisterDTOStub(), password: '' })
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should allow registration without an email', () => {
                const dto = RegisterDTOStub();
                delete dto.email;
                return pactum
                    .spec()
                    .post('/register')
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED);
            });

            it('should throw an error if username is already taken', async () => {
                const dto = {
                    ...RegisterDTOStub(),
                    username: 'unique_username',
                };
                delete dto.email;

                await pactum
                    .spec()
                    .post('/register')
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED);
                return pactum
                    .spec()
                    .post('/register')
                    .withBody(dto)
                    .expectStatus(HttpStatus.CONFLICT);
            });

            it('should throw an error if email is already taken', async () => {
                const firstDto = {
                    ...RegisterDTOStub(),
                    username: 'first',
                    email: 'reused@email.com',
                };

                const secondDto = {
                    ...RegisterDTOStub(),
                    username: 'second',
                    email: 'reused@email.com',
                };

                await pactum
                    .spec()
                    .post('/register')
                    .withBody(firstDto)
                    .expectStatus(HttpStatus.CREATED);
                return pactum
                    .spec()
                    .post('/register')
                    .withBody(secondDto)
                    .expectStatus(HttpStatus.CONFLICT);
            });

            it('should be able to register if form fields are valid', () => {
                return pactum
                    .spec()
                    .post('/register')
                    .withBody(RegisterDTOStub())
                    .expectStatus(HttpStatus.CREATED);
            });
        });

        describe('login', () => {
            it('should throw an error if username or email does not exist', async () => {
                await pactum
                    .spec()
                    .post('/login')
                    .withBody(LoginDTOStub({ useEmail: true }))
                    .expectStatus(HttpStatus.FORBIDDEN);

                await pactum
                    .spec()
                    .post('/login')
                    .withBody(LoginDTOStub({ useEmail: false }))
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it('should throw an error if password is incorrect', async () => {
                const registerDto = {
                    ...RegisterDTOStub(),
                    password: 'correct-password',
                };
                const loginDto = {
                    ...LoginDTOStub(),
                    password: 'incorrect-password',
                };

                await pactum
                    .spec()
                    .post('/register')
                    .withBody(registerDto)
                    .expectStatus(HttpStatus.CREATED);

                return pactum
                    .spec()
                    .post('/login')
                    .withBody(loginDto)
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it('should be able to login if valid credentials are provided', async () => {
                await pactum
                    .spec()
                    .post('/register')
                    .withBody(RegisterDTOStub())
                    .expectStatus(HttpStatus.CREATED);

                return pactum
                    .spec()
                    .post('/login')
                    .withBody(LoginDTOStub())
                    .expectStatus(HttpStatus.OK);
            });
        });
    });

    describe('User', () => {
        beforeAll(async () => {
            await pactum
                .spec()
                .post('/register')
                .withBody(RegisterDTOStub())
                .expectStatus(HttpStatus.CREATED);

            await pactum
                .spec()
                .post('/login')
                .withBody(LoginDTOStub())
                .expectStatus(HttpStatus.OK)
                .stores('ownerAccessToken', 'access_token');
        });

        describe('Get me', () => {
            it('should get current user', () => {
                return pactum
                    .spec()
                    .get('/users/me')
                    .withHeaders({
                        Authorization: 'Bearer $S{ownerAccessToken}',
                    })
                    .expectStatus(HttpStatus.OK);
            });
        });

        describe('Update user', () => {
            it.todo('should edit user');
        });

        describe('Delete user', () => {
            it.todo('should delete user');
        });
    });

    describe('Projects', () => {
        const owner = LoginDTOStub();
        let ownerAccessToken: string;

        beforeEach(async () => {
            await pactum
                .spec()
                .post('/register')
                .withBody(RegisterDTOStub())
                .expectStatus(HttpStatus.CREATED);

            ownerAccessToken = await pactum
                .spec()
                .post('/login')
                .withBody(owner)
                .expectStatus(HttpStatus.OK)
                .returns('access_token');
        });

        describe('Create project', () => {
            it('should throw an error on invalid project value', () => {
                const dto = 'bad_body_value';
                return pactum
                    .spec()
                    .post('/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should create a project for the current user', () => {
                const dto = CreateProjectDTOStub();
                return pactum
                    .spec()
                    .post('/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED);
            });
        });

        describe('Find project', () => {
            let projectId: string;

            beforeEach(async () => {
                const dto = CreateProjectDTOStub();
                projectId = await pactum
                    .spec()
                    .post('/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED)
                    .returns('_id');
            });

            it('should find all projects by a user', () => {
                return pactum
                    .spec()
                    .get('/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonLength(1);
            });

            it('should return 404 when retrieving non-existent project', () => {
                const badProjectId = 'bad_id';
                return pactum
                    .spec()
                    .get('/projects/{id}')
                    .withPathParams('id', badProjectId)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NOT_FOUND);
            });

            it('should find a project by project id', () => {
                return pactum
                    .spec()
                    .get('/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectBodyContains(`${projectId}`);
            });
        });

        describe('Update project', () => {
            let updatedProjectDto: CreateProjectDto;
            let projectId: string;

            beforeEach(async () => {
                const dto = CreateProjectDTOStub();
                updatedProjectDto = {
                    ...CreateProjectDTOStub(),
                    title: 'Updated title',
                };
                projectId = await pactum
                    .spec()
                    .post('/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED)
                    .returns('_id');
            });

            it('should be able to update the project details', () => {
                return pactum
                    .spec()
                    .patch('/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(updatedProjectDto)
                    .expectStatus(HttpStatus.OK)
                    .expectJsonMatch(updatedProjectDto);
            });

            it('should not allow updating project details if not project owner', async () => {
                const nonOwnerCredentials = {
                    username: 'hackerman',
                    email: 'hackerman@hack.com',
                };
                await pactum
                    .spec()
                    .post('/register')
                    .withBody({ ...RegisterDTOStub(), ...nonOwnerCredentials })
                    .expectStatus(HttpStatus.CREATED);
                const nonOwnerAccessToken = await pactum
                    .spec()
                    .post('/login')
                    .withBody({
                        ...LoginDTOStub(),
                        usernameOrEmail: nonOwnerCredentials.username,
                    })
                    .expectStatus(HttpStatus.OK)
                    .returns('access_token');

                return pactum
                    .spec()
                    .patch('/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${nonOwnerAccessToken}`,
                    })
                    .withBody(updatedProjectDto)
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it.todo(
                'should not allow updating project details if not a project collaborator',
            );
        });
    });
});
