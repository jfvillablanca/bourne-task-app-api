import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Types } from 'mongoose';
import { request, spec } from 'pactum';
import { UpdateProjectDto, UpdateTaskDto } from '../src/project/dto';
import { Task } from '../src/project/types';
import { AppModule } from './../src/app.module';
import { AuthDTOStub, CreateProjectDTOStub } from './stubs';
import { CreateTaskDTOStub } from './stubs/task.dto.stub';
import { generateJwtToken, getUserIdWithToken } from './utils';

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

        request.setBaseUrl(baseUrl);
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
            it('should throw an error if email is empty during registration', async () => {
                await spec()
                    .post('/api/auth/local/register')
                    .withBody({ ...AuthDTOStub(), email: '' })
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should throw an error if password is empty during registration', async () => {
                await spec()
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

                await spec()
                    .post('/api/auth/local/register')
                    .withBody(firstDto)
                    .expectStatus(HttpStatus.CREATED);
                await spec()
                    .post('/api/auth/local/register')
                    .withBody(secondDto)
                    .expectStatus(HttpStatus.CONFLICT);
            });

            it('should be able to register if form fields are valid', async () => {
                await spec()
                    .post('/api/auth/local/register')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.CREATED);
            });
        });

        describe('login', () => {
            it('should throw an error if email does not exist', async () => {
                await spec()
                    .post('/api/auth/local/login')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.FORBIDDEN);

                await spec()
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

                await spec()
                    .post('/api/auth/local/register')
                    .withBody(registerDto)
                    .expectStatus(HttpStatus.CREATED);

                await spec()
                    .post('/api/auth/local/login')
                    .withBody(loginDto)
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it('should be able to login if valid credentials are provided', async () => {
                await spec()
                    .post('/api/auth/local/register')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.CREATED);

                await spec()
                    .post('/api/auth/local/login')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.OK);
            });
        });

        describe('logout', () => {
            const user = AuthDTOStub();
            let userAccessToken: string;

            beforeEach(async () => {
                await spec()
                    .post('/api/auth/local/register')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.CREATED);

                userAccessToken = await spec()
                    .post('/api/auth/local/login')
                    .withBody(user)
                    .expectStatus(HttpStatus.OK)
                    .returns('access_token');
            });

            it('should be able to logout when logged in', async () => {
                await spec()
                    .post('/api/auth/logout')
                    .withHeaders({
                        Authorization: `Bearer ${userAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK);
            });

            it('should return Unauthorized status if logout is called without proper auth', async () => {
                await spec()
                    .post('/api/auth/logout')
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });
        });

        describe('refresh', () => {
            const user = AuthDTOStub();
            let userRefreshToken: string;

            beforeEach(async () => {
                await spec()
                    .post('/api/auth/local/register')
                    .withBody(AuthDTOStub())
                    .expectStatus(HttpStatus.CREATED);

                userRefreshToken = await spec()
                    .post('/api/auth/local/login')
                    .withBody(user)
                    .expectStatus(HttpStatus.OK)
                    .returns('refresh_token');
            });

            it('should return Unauthorized status if refresh is called without proper auth', async () => {
                await spec()
                    .post('/api/auth/refresh')
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should be able to refresh tokens with from request with valid refresh tokens', async () => {
                await spec()
                    .post('/api/auth/refresh')
                    .withHeaders({
                        Authorization: `Bearer ${userRefreshToken}`,
                    })
                    .expectStatus(HttpStatus.OK);
            });

            it.todo(
                'should return Unauthorized status on request using expired auth',
            );
        });
    });

    describe('User', () => {
        let ownerAccessToken: string;
        beforeEach(async () => {
            await spec()
                .post('/api/auth/local/register')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.CREATED);

            ownerAccessToken = await spec()
                .post('/api/auth/local/login')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.OK)
                .returns('access_token');
        });

        describe('Find user', () => {
            it('should find all users', async () => {
                await spec()
                    .get('/api/users')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK);
            });

            it('should not be able to access protected route /users for requests with missing authentication', async () => {
                await spec()
                    .get('/api/users')
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should get current user', async () => {
                await spec()
                    .get('/api/users/me')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK);
            });

            it('should not be able to access protected route /users/me for requests with missing authentication', async () => {
                await spec()
                    .get('/api/users/me')
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should not be able to access protected route GET /users/me for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );
                await spec()
                    .get('/api/users/me')
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it.todo(
                'should be able to retrieve projects owned by a specific user',
            );

            it.todo(
                'should be able to retrieve projects that a user is a member of',
            );
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
            await spec()
                .post('/api/auth/local/register')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.CREATED);

            ownerAccessToken = await spec()
                .post('/api/auth/local/login')
                .withBody(owner)
                .expectStatus(HttpStatus.OK)
                .returns('access_token');
        });

        describe('Create project', () => {
            it('should throw an error on invalid project value', async () => {
                const dto = 'bad_body_value';
                await spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should create a project for the current user', async () => {
                const dto = CreateProjectDTOStub();
                await spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED);
            });

            it('should not be able to access protected route POST /api/projects for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );
                const dto = CreateProjectDTOStub();
                await spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });
        });

        describe('Find project', () => {
            let projectId: string;
            let collaboratorUserId: string;
            let collaboratorAccessToken: string;
            const collaboratorCredentials = {
                email: 'collab@orator.com',
            };

            beforeEach(async () => {
                const dto = CreateProjectDTOStub();
                // Owner creates a new project
                projectId = await spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED)
                    .returns('_id');

                // Register a collaborator user
                await spec()
                    .post('/api/auth/local/register')
                    .withBody({
                        ...AuthDTOStub(),
                        ...collaboratorCredentials,
                    })
                    .expectStatus(HttpStatus.CREATED);
                collaboratorAccessToken = await spec()
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

                // Let owner add the collaborator to the collaborators list
                const projectDtoWithCollaborator: UpdateProjectDto = {
                    ...CreateProjectDTOStub(),
                    collaborators: [collaboratorUserId],
                };
                await spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(projectDtoWithCollaborator)
                    .expectStatus(HttpStatus.OK);
            });

            it('should find all projects by a user', async () => {
                await spec()
                    .get('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonLength(1);
            });

            it('should not be able to access protected route GET /api/projects for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );
                await spec()
                    .get('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should allow a collaborator to find all projects by a user', async () => {
                await spec()
                    .get('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${collaboratorAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonLength(1);
            });

            it('should return 404 when retrieving non-existent project', async () => {
                const nonExistentProjectId = new Types.ObjectId().toHexString();
                await spec()
                    .get('/api/projects/{id}')
                    .withPathParams('id', nonExistentProjectId)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NOT_FOUND);
            });

            it('should find a project by project id', async () => {
                await spec()
                    .get('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectBodyContains(`${projectId}`);
            });

            it('should not be able to access protected route GET /api/projects/{id} for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );
                await spec()
                    .get('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should be able to retrieve project members: owner + collaborators', async () => {
                const collaborators = [
                    { email: 'Sincere@april.biz', password: 'mock' },
                    { email: 'Sherwood@rosamond.me', password: 'mock' },
                    { email: 'Rey.Padberg@karina.biz', password: 'mock' },
                ];
                const tokens: {
                    access_token: string;
                    refresh_token: string;
                }[] = await Promise.all(
                    collaborators.map(async (collaborator) => {
                        return await spec()
                            .post('/api/auth/local/register')
                            .withBody(collaborator)
                            .returns('res.body');
                    }),
                );
                const collaboratorIds = tokens.map((token) => {
                    return getUserIdWithToken(token.access_token);
                });

                await spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody({
                        collaborators: collaboratorIds,
                    })
                    .expectStatus(HttpStatus.OK);

                const response: { _id: string; email: string }[] = await spec()
                    .get('/api/projects/{id}/members')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonLength(4)
                    .returns('res.body');

                const memberEmails = [
                    owner.email,
                    ...collaborators.map((collaborator) => collaborator.email),
                ];
                const responseEmails = response.map((user) => user.email);
                expect(responseEmails).toStrictEqual(memberEmails);
            });

            it('should not be able to access protected route GET /api/projects/{id}/members for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );
                await spec()
                    .get('/api/projects/{id}/members')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
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
                projectId = await spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED)
                    .returns('_id');

                // Register a non-owner user
                await spec()
                    .post('/api/auth/local/register')
                    .withBody({ ...AuthDTOStub(), ...nonOwnerCredentials })
                    .expectStatus(HttpStatus.CREATED);
                nonOwnerAccessToken = await spec()
                    .post('/api/auth/local/login')
                    .withBody({
                        ...AuthDTOStub(),
                        email: nonOwnerCredentials.email,
                    })
                    .expectStatus(HttpStatus.OK)
                    .returns('access_token');

                // Register a collaborator user
                await spec()
                    .post('/api/auth/local/register')
                    .withBody({
                        ...AuthDTOStub(),
                        ...collaboratorCredentials,
                    })
                    .expectStatus(HttpStatus.CREATED);
                collaboratorAccessToken = await spec()
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

            it('should be able to update the project details', async () => {
                await spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(updatedProjectDto)
                    .expectStatus(HttpStatus.OK)
                    .expectJsonMatch(updatedProjectDto);
            });

            it('should not be able to access protected route PATCH /api/projects/{id} for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );
                await spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .withBody(updatedProjectDto)
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should not allow updating project details if not project owner', async () => {
                await spec()
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
                await spec()
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

                await spec()
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
                projectId = await spec()
                    .post('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.CREATED)
                    .returns('_id');
            });

            it('should delete project by owner', async () => {
                await spec()
                    .delete('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NO_CONTENT);

                await spec()
                    .get('/api/projects')
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonLength(0);
            });

            it('should not be able to access protected route DELETE /api/projects/{id} for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );
                await spec()
                    .delete('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });
        });
    });

    describe('Tasks', () => {
        let ownerAccessToken: string;
        let projectId: string;

        beforeEach(async () => {
            // Register a user
            await spec()
                .post('/api/auth/local/register')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.CREATED);

            // Log a user in
            ownerAccessToken = await spec()
                .post('/api/auth/local/login')
                .withBody(AuthDTOStub())
                .expectStatus(HttpStatus.OK)
                .returns('access_token');

            // User creates a new project
            projectId = await spec()
                .post('/api/projects')
                .withHeaders({
                    Authorization: `Bearer ${ownerAccessToken}`,
                })
                .withBody(CreateProjectDTOStub())
                .expectStatus(HttpStatus.CREATED)
                .returns('_id');
        });

        describe('Create task', () => {
            it('should throw an error on invalid task value', async () => {
                const invalidTask = { ...CreateTaskDTOStub(), title: '' };

                await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(invalidTask)
                    .expectStatus(HttpStatus.BAD_REQUEST);
            });

            it('should create a task successfully', async () => {
                const newTask = CreateTaskDTOStub();

                await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(newTask)
                    .expectStatus(HttpStatus.CREATED)
                    .expectJsonMatch(newTask);
            });

            it('should not be able to access protected route POST /api/projects/{projectId}/tasks for requests with expired authentication', async () => {
                const newTask = CreateTaskDTOStub();
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );

                await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .withBody(newTask)
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });
        });

        describe('Find task', () => {
            it('should find all tasks from a project', async () => {
                const newTask = CreateTaskDTOStub();
                await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(newTask)
                    .expectStatus(HttpStatus.CREATED);

                await spec()
                    .get('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonLength(1)
                    .expectJsonMatch([newTask]);
            });

            it('should not be able to access protected route GET /api/projects/{projectId}/tasks for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );

                await spec()
                    .get('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should find a specific task from a project', async () => {
                const newTask: Task = await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(CreateTaskDTOStub())
                    .expectStatus(HttpStatus.CREATED)
                    .returns('res.body');

                await spec()
                    .get('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${newTask._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.OK)
                    .expectJsonMatch(newTask);
            });

            it('should not be able to access protected route GET /api/projects/{projectId}/tasks for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );

                const newTask: Task = await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(CreateTaskDTOStub())
                    .expectStatus(HttpStatus.CREATED)
                    .returns('res.body');

                await spec()
                    .get('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${newTask._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });

            it('should return 404 on non-existent task', async () => {
                const nonExistentTaskId = new Types.ObjectId().toHexString();
                await spec()
                    .get('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${nonExistentTaskId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NOT_FOUND);
            });
        });

        describe('Update task', () => {
            let oldTask: Task;
            let dto: UpdateTaskDto;
            const assignedMembers = [
                new Types.ObjectId(1).toHexString(),
                new Types.ObjectId(2).toHexString(),
            ];

            beforeEach(async () => {
                // Create a task to update
                oldTask = await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(CreateTaskDTOStub())
                    .expectStatus(HttpStatus.CREATED)
                    .returns('res.body');

                dto = {
                    ...CreateTaskDTOStub(),
                    title: 'Task with assigned members',
                    description: 'Task with summary',
                    assignedProjMemberId: assignedMembers,
                };
            });

            it('should throw an error on invalid project id', async () => {
                const nonExistentProjectId = new Types.ObjectId().toHexString();

                await spec()
                    .patch('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${nonExistentProjectId}`)
                    .withPathParams('taskId', `${oldTask._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.NOT_FOUND);
            });

            it('should throw an error on invalid task id', async () => {
                const nonExistentTaskId = new Types.ObjectId().toHexString();

                await spec()
                    .patch('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${nonExistentTaskId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.NOT_FOUND);
            });

            it('should update a task successfully', async () => {
                await spec()
                    .patch('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${oldTask._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.OK)
                    .expect((ctx) => {
                        const updatedTask: Task = ctx.res.body;

                        expect(updatedTask._id).toBe(oldTask._id);
                        expect(updatedTask.title).not.toBe(oldTask.title);
                        expect(updatedTask.title).toBe(dto.title);
                        expect(updatedTask.description).toBe(dto.description);
                        expect(updatedTask.assignedProjMemberId).toStrictEqual(
                            assignedMembers,
                        );
                    });
            });

            it('should not be able to access protected route PATCH /api/projects/{projectId}/tasks/{taskId} for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );

                await spec()
                    .patch('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${oldTask._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .withBody(dto)
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });
        });

        describe('Delete task', () => {
            let taskToBeDeleted: Task;

            let collaboratorUserId: string;
            let collaboratorAccessToken: string;
            const collaboratorCredentials = {
                email: 'collab@orator.com',
            };

            beforeEach(async () => {
                // Register a collaborator user
                await spec()
                    .post('/api/auth/local/register')
                    .withBody({
                        ...AuthDTOStub(),
                        ...collaboratorCredentials,
                    })
                    .expectStatus(HttpStatus.CREATED);
                collaboratorAccessToken = await spec()
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

                // Let owner add the collaborator to the collaborators list
                const projectDtoWithCollaborator: UpdateProjectDto = {
                    collaborators: [collaboratorUserId],
                };
                await spec()
                    .patch('/api/projects/{id}')
                    .withPathParams('id', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(projectDtoWithCollaborator)
                    .expectStatus(HttpStatus.OK);

                // Create a task to update
                taskToBeDeleted = await spec()
                    .post('/api/projects/{projectId}/tasks')
                    .withPathParams('projectId', `${projectId}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .withBody(CreateTaskDTOStub())
                    .expectStatus(HttpStatus.CREATED)
                    .returns('res.body');
            });

            it('should not be able to delete task by any non-project member', async () => {
                // Register a non-project user
                await spec()
                    .post('/api/auth/local/register')
                    .withBody({
                        ...AuthDTOStub(),
                        email: 'non@owner.com',
                    })
                    .expectStatus(HttpStatus.CREATED);

                const nonMemberAccessToken = await spec()
                    .post('/api/auth/local/login')
                    .withBody({
                        ...AuthDTOStub(),
                        email: 'non@owner.com',
                    })
                    .expectStatus(HttpStatus.OK)
                    .returns('access_token');

                // Non-project member attempts to delete
                await spec()
                    .delete('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${taskToBeDeleted._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${nonMemberAccessToken}`,
                    })
                    .expectStatus(HttpStatus.FORBIDDEN);
            });

            it('should be able to delete task by owner', async () => {
                await spec()
                    .delete('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${taskToBeDeleted._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NO_CONTENT);

                // Find deleted task
                await spec()
                    .get('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${taskToBeDeleted._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${ownerAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NOT_FOUND);
            });

            it('should be able to delete task by a project member', async () => {
                await spec()
                    .delete('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${taskToBeDeleted._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${collaboratorAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NO_CONTENT);

                // Find deleted task
                await spec()
                    .get('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${taskToBeDeleted._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${collaboratorAccessToken}`,
                    })
                    .expectStatus(HttpStatus.NOT_FOUND);
            });

            it('should not be able to access protected route DELETE /api/projects/{projectId}/tasks/{taskId} for requests with expired authentication', async () => {
                const ownerId = getUserIdWithToken(ownerAccessToken);
                const expiredAccessToken = generateJwtToken(
                    { sub: ownerId, email: AuthDTOStub().email },
                    '1ms',
                );

                await spec()
                    .delete('/api/projects/{projectId}/tasks/{taskId}')
                    .withPathParams('projectId', `${projectId}`)
                    .withPathParams('taskId', `${taskToBeDeleted._id}`)
                    .withHeaders({
                        Authorization: `Bearer ${expiredAccessToken}`,
                    })
                    .expectStatus(HttpStatus.UNAUTHORIZED);
            });
        });
    });
});
