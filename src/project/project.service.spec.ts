import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { CreateProjectDTOStub } from '../../test/stubs';
import { User, UserSchema } from '../user/entities';
import { UpdateProjectDto } from './dto';
import { Project, ProjectSchema } from './entities';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
    let service: ProjectService;
    let mongod: MongoMemoryServer;
    let mongoConnection: Connection;
    let projectModel: Model<Project>;
    let userModel: Model<User>;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        mongoConnection = (await connect(uri)).connection;
        projectModel = mongoConnection.model(Project.name, ProjectSchema);
        userModel = mongoConnection.model(User.name, UserSchema);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectService,
                {
                    provide: getModelToken(Project.name),
                    useValue: projectModel,
                },
                {
                    provide: getModelToken(User.name),
                    useValue: userModel,
                },
            ],
        }).compile();

        service = module.get<ProjectService>(ProjectService);
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

    describe('Find project', () => {
        it('should return an empty array of projects for user with no projects', async () => {
            const ownerId = new Types.ObjectId().toHexString();

            const projects = await service.findAll(ownerId);

            expect(projects).toStrictEqual([]);
        });

        it('should find all projects as the owner', async () => {
            const ownerId = new Types.ObjectId().toHexString();
            const dto = { ...CreateProjectDTOStub(), ownerId };
            await new projectModel(dto).save();

            const projects = await service.findAll(ownerId);

            expect(projects.length).toBe(1);
            expect(projects[0].title).toBe(dto.title);
            expect(projects[0].description).toBe(dto.description);
        });

        it('should allow a collaborator to find all projects of some owner', async () => {
            const ownerId = new Types.ObjectId(0).toHexString();
            const collaboratorId = new Types.ObjectId(1).toHexString();
            const dto = { ...CreateProjectDTOStub(), ownerId };
            const projectId = (
                await new projectModel(dto).save()
            )._id.toHexString();
            // Let owner add the collaborator to the collaborators list
            await service.update(ownerId, projectId, {
                collaborators: [collaboratorId],
            });

            const projects = await service.findAll(collaboratorId);

            expect(projects.length).toBe(1);
            expect(projects[0].title).toBe(dto.title);
            expect(projects[0].description).toBe(dto.description);
        });

        it('should throw an error when retrieving non-existent project', async () => {
            const nonExistentProjectId = new Types.ObjectId().toHexString();
            await expect(service.findOne(nonExistentProjectId)).rejects.toThrow(
                /Project not found/,
            );
        });

        it('should find a project by project id', async () => {
            const ownerId = new Types.ObjectId().toHexString();
            const dto = { ...CreateProjectDTOStub(), ownerId };
            await new projectModel(dto).save();
            const projects = await service.findAll(ownerId);
            const lookForProjectId = projects[0].id;

            const foundProject = await service.findOne(lookForProjectId);

            expect(foundProject.id).toBe(lookForProjectId);
        });

        it('should find a project and retrieve its project members', async () => {
            const owner = { email: 'Boberline@sci.co', password: 'mock' };
            const collaborators = [
                { email: 'Sincere@april.biz', password: 'mock' },
                { email: 'Sherwood@rosamond.me', password: 'mock' },
                { email: 'Rey.Padberg@karina.biz', password: 'mock' },
            ];

            const newUsers = await userModel.insertMany([
                owner,
                ...collaborators,
            ]);
            const collaboratorIds = newUsers.slice(-3).map((user) => user._id);
            const ownerId = newUsers[0]._id;

            const dto = {
                ...CreateProjectDTOStub(),
                ownerId,
                collaborators: collaboratorIds,
            };
            await new projectModel(dto).save();
            const projects = await service.findAll(ownerId.toHexString());
            const lookForProjectId = projects[0].id;

            const projectMembers = await service.getProjectMembers(
                lookForProjectId,
            );

            expect(projectMembers).toStrictEqual(
                newUsers.map((user) => ({ _id: user._id, email: user.email })),
            );
        });
    });

    describe('Create project', () => {
        it('should throw an error on bad project body', async () => {
            const ownerId = new Types.ObjectId().toHexString();
            const dto = { ...CreateProjectDTOStub(), title: '' };

            await expect(service.create(ownerId, dto)).rejects.toThrow(
                /ValidationError/,
            );
        });

        it('should be able to create a project and save to database', async () => {
            const ownerId = new Types.ObjectId().toHexString();
            const dto = CreateProjectDTOStub();

            const newProject = await service.create(ownerId, dto);

            expect(newProject.ownerId.toString()).toBe(ownerId);
            expect(newProject.title).toBe(dto.title);
            expect(newProject.description).toBe(dto.description);
        });
    });

    describe('Update project', () => {
        let ownerId: string;
        let nonOwnerId: string;
        let collaboratorId: string;
        let projectId: string;
        let updatedProjectDto: UpdateProjectDto;
        const initialProjectDto = CreateProjectDTOStub();

        beforeEach(async () => {
            ownerId = new Types.ObjectId(1).toHexString();
            nonOwnerId = new Types.ObjectId(2).toHexString();
            collaboratorId = new Types.ObjectId(2).toHexString();
            projectId = (await service.create(ownerId, initialProjectDto)).id;
            updatedProjectDto = {
                ...initialProjectDto,
                title: 'Updated Title',
            };
        });

        it('should be able to update project details if owner credentials', async () => {
            const updatedProject = await service.update(
                ownerId,
                projectId,
                updatedProjectDto,
            );

            expect(updatedProject.ownerId.toString()).toBe(ownerId);
            expect(updatedProject.id).toBe(projectId);
            expect(updatedProject.description).toBe(
                initialProjectDto.description,
            );
            expect(updatedProject.title).toBe(updatedProjectDto.title);
        });

        it('should be able to update project details if collaborator credentials', async () => {
            // Let owner add the collaborator to the collaborators list
            await service.update(ownerId, projectId, {
                ...updatedProjectDto,
                collaborators: [collaboratorId],
            });

            // Collaborator makes edits on the Project
            updatedProjectDto = {
                ...initialProjectDto,
                title: 'Edited by a collaborator',
            };
            const updatedProject = await service.update(
                collaboratorId,
                projectId,
                updatedProjectDto,
            );

            expect(updatedProject.ownerId.toString()).toBe(ownerId);
            expect(updatedProject.id).toBe(projectId);
            expect(updatedProject.description).toBe(
                initialProjectDto.description,
            );
            expect(updatedProject.title).toBe(updatedProjectDto.title);
            expect(updatedProject.collaborators.toString()).toBe(
                [collaboratorId].toString(),
            );
        });

        it('should throw a ForbiddenException when updating with improper credentials', async () => {
            await expect(
                service.update(nonOwnerId, projectId, updatedProjectDto),
            ).rejects.toThrow(/Invalid credentials: Cannot update resource/);
        });
    });

    describe('Delete project', () => {
        let ownerId: string;
        // let nonOwnerId: string;
        // let collaboratorId: string;
        let projectId: string;
        const initialProjectDto = CreateProjectDTOStub();

        beforeEach(async () => {
            ownerId = new Types.ObjectId(1).toHexString();
            // nonOwnerId = new Types.ObjectId(2).toHexString();
            // collaboratorId = new Types.ObjectId(2).toHexString();
            projectId = (await service.create(ownerId, initialProjectDto)).id;
        });

        it('should be able to delete project if owner credentials', async () => {
            await service.remove(ownerId, projectId);

            const projects = await service.findAll(ownerId);

            expect(projects).toStrictEqual([]);
        });
    });
});
