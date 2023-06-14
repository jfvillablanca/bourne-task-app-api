import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { UpdateProjectDto } from '../src/project/dto';
import { AppModule } from './../src/app.module';
import { CreateProjectDTOStub, AuthDTOStub } from './stubs';
import { getUserIdWithToken } from './utils';

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
        app.setGlobalPrefix('api');

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
            it('should throw an error if email is empty during registration', () => {
                return pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody({ ...AuthDTOStub(), email: '' })
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should throw an error if password is empty during registration', () => {
                return pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody({ ...AuthDTOStub(), password: '' })
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should throw an error if email is already taken', async () => {
                const firstDto = {
                    ...AuthDTOStub(),
                    email: 'reused@email.com',
                };

                const secondDto = {
                    ...AuthDTOStub(),
                    email: 'reused@email.com',
                };

                await pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody(firstDto)
                    .expectStatus(HttpStatus.CREATED);
                return pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody(secondDto)
                    .expectStatus(HttpStatus.CONFLICT);
            });

            it('should be able to register if form fields are valid', () => {
                return pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.CREATED);
            });
        });

        describe('login', () => {
            it('should throw an error if email does not exist', async () => {
                await pactum
                    .spec()
                    .post('/api/auth/local/login')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.FORBIDDEN);

                await pactum
                    .spec()
                    .post('/api/auth/local/login')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it('should throw an error if password is incorrect', async () => {
                const registerDto = {
                    ...AuthDTOStub(),
                    password: 'correct-password',
                };
                const loginDto = {
                    ...AuthDTOStub(),
                    password: 'incorrect-password',
                };

                await pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody(registerDto)
                    .expectStatus(HttpStatus.CREATED);

                return pactum
                    .spec()
                    .post('/api/auth/local/login')
                    .withBody(loginDto)
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it('should be able to login if valid credentials are provided', async () => {
                await pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.CREATED);

                return pactum
                    .spec()
                    .post('/api/auth/local/login')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.OK);
            });
        });
    });

    describe('User', () => {
        let ownerAccessToken: string;
        beforeAll(async () => {
            await pactum
                .spec()
                .post('/api/auth/local/register')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.CREATED);

            ownerAccessToken = await pactum
                .spec()
                .post('/api/auth/local/login')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.OK)
                .returns('access_token');
        });

        describe('Get me', () => {
            it('should get current user', () => {
                return pactum
                    .spec()
                    .get('/api/users/me')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK);
            });

            it('should not be able to access protected route /users/me for requests with missing authentication', () => {
                return pactum
                    .spec()
                    .get('/api/users/me')
                    .expectStatus(HttpStatus.UNAUTHORIZED);
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
        const owner = AuthDTOStub();
        let ownerAccessToken: string;

        beforeEach(async () => {
            await pactum
                .spec()
                .post('/api/auth/local/register')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.CREATED);

            ownerAccessToken = await pactum
                .spec()
                .post('/api/auth/local/login')
                .withBody(owner)
                .expectStatus(HttpStatus.OK)
                .returns('access_token');
        });

        describe('Create project', () => {
            it('should throw an error on invalid project value', () => {
                const dto = 'bad_body_value';
                return pactum
                    .spec()
                    .post('/api/projects')
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
                    .post('/api/projects')
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
                    .post('/api/projects')
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
                    .get('/api/projects')
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
                    .get('/api/projects/{id}')
                    .withPathParams('id', badProjectId)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NOT_FOUND);
            });

            it('should find a project by project id', () => {
                return pactum
                    .spec()
                    .get('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectBodyContains(`${projectId}`);
            });
        });

        describe('Update project', () => {
            let updatedProjectDto: UpdateProjectDto;
            let projectId: string;

            let nonOwnerAccessToken: string;
            const nonOwnerCredentials = {
                email: 'hackerman@hack.com',
            };

            let collaboratorUserId: string;
            let collaboratorAccessToken: string;
            const collaboratorCredentials = {
                email: 'collab@orator.com',
            };

            beforeEach(async () => {
                const dto = CreateProjectDTOStub();
                updatedProjectDto = {
                    ...CreateProjectDTOStub(),
                    title: 'Updated title',
                };

                // Owner creates a new project
                projectId = await pactum
                    .spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED)
                    .returns('_id');

                // Register a non-owner user
                await pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody({ ...AuthDTOStub(), ...nonOwnerCredentials })
                    .expectStatus(HttpStatus.CREATED);
                nonOwnerAccessToken = await pactum
                    .spec()
                    .post('/api/auth/local/login')
                    .withBody({
                        ...AuthDTOStub(),
                        email: nonOwnerCredentials.email,
                    })
                    .expectStatus(HttpStatus.OK)
                    .returns('access_token');

                // Register a collaborator user
                await pactum
                    .spec()
                    .post('/api/auth/local/register')
                    .withBody({
                        ...AuthDTOStub(),
                        ...collaboratorCredentials,
                    })
                    .expectStatus(HttpStatus.CREATED);
                collaboratorAccessToken = await pactum
                    .spec()
                    .post('/api/auth/local/login')
                    .withBody({
                        ...AuthDTOStub(),
                        email: collaboratorCredentials.email,
                    })
                    .expectStatus(HttpStatus.OK)
                    .returns('access_token');

                // Get collaborator's id
                collaboratorUserId = getUserIdWithToken(
                    collaboratorAccessToken,
                );
            });

            it('should be able to update the project details', () => {
                return pactum
                    .spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(updatedProjectDto)
                    .expectStatus(HttpStatus.OK)
                    .expectJsonMatch(updatedProjectDto);
            });

            it('should not allow updating project details if not project owner', async () => {
                return pactum
                    .spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${nonOwnerAccessToken}`,
                    })
                    .withBody(updatedProjectDto)
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it('should allow updating project details if user is project collaborator', async () => {
                // Let owner add the collaborator to the collaborators list
                const projectDtoWithCollaborator: UpdateProjectDto = {
                    ...CreateProjectDTOStub(),
                    collaborators: [collaboratorUserId],
                };
                await pactum
                    .spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(projectDtoWithCollaborator)
                    .expectStatus(HttpStatus.OK);

                // Collaborator makes edits on the Project
                const updatedProjectByCollaborator: UpdateProjectDto = {
                    ...CreateProjectDTOStub(),
                    title: 'Edited by a collaborator',
                };

                return pactum
                    .spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${collaboratorAccessToken}`,
                    })
                    .withBody(updatedProjectByCollaborator)
                    .expectStatus(HttpStatus.OK)
                    .expectJsonMatch(updatedProjectByCollaborator);
            });
        });

        describe('Delete project', () => {
            let projectId: string;

            beforeEach(async () => {
                const dto = CreateProjectDTOStub();
                projectId = await pactum
                    .spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED)
                    .returns('_id');
            });

            it('should delete project by owner', async () => {
                await pactum
                    .spec()
                    .delete('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NO_CONTENT);

                return pactum
                    .spec()
                    .get('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonLength(0);
            });
        });
    });
});
