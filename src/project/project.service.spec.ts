import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { CreateProjectDTOStub } from '../../test/stubs';
import { UpdateProjectDto } from './dto';
import { Project, ProjectSchema } from './entities';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
    let service: ProjectService;
    let mongod: MongoMemoryServer;
    let mongoConnection: Connection;
    let projectModel: Model<Project>;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        mongoConnection = (await connect(uri)).connection;
        projectModel = mongoConnection.model(Project.name, ProjectSchema);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectService,
                {
                    provide: getModelToken(Project.name),
                    useValue: projectModel,
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
            const ownerId = new Types.ObjectId().toString();

            const projects = await service.findAll(ownerId);

            expect(projects).toStrictEqual([]);
        });

        it('should find a single project in the projects array owned by the user', async () => {
            const ownerId = new Types.ObjectId().toString();
            const dto = { ...CreateProjectDTOStub(), ownerId };
            await new projectModel(dto).save();

            const projects = await service.findAll(ownerId);

            expect(projects.length).toBe(1);
            expect(projects[0].title).toBe(dto.title);
            expect(projects[0].description).toBe(dto.description);
        });

        it('should throw an error when retrieving non-existent project', async () => {
            await expect(service.findOne('bad_id')).rejects.toThrow(
                new NotFoundException('Project not found'),
            );
        });

        it('should find a project by project id', async () => {
            const ownerId = new Types.ObjectId().toString();
            const dto = { ...CreateProjectDTOStub(), ownerId };
            await new projectModel(dto).save();
            const projects = await service.findAll(ownerId);
            const lookForProjectId = projects[0].id;

            const foundProject = await service.findOne(lookForProjectId);

            expect(foundProject.id).toBe(lookForProjectId);
        });
    });

    describe('Create project', () => {
        it('should throw an error on bad project body', async () => {
            const ownerId = new Types.ObjectId().toString();
            const dto = { ...CreateProjectDTOStub(), title: '' };

            await expect(service.create(ownerId, dto)).rejects.toThrow();
        });

        it('should be able to create a project and save to database', async () => {
            const ownerId = new Types.ObjectId().toString();
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
            ownerId = new Types.ObjectId(1).toString();
            nonOwnerId = new Types.ObjectId(2).toString();
            collaboratorId = new Types.ObjectId(2).toString();
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
            ).rejects.toThrow(
                new ForbiddenException(
                    'Invalid credentials: Cannot update resource',
                ),
            );
        });
    });
});
