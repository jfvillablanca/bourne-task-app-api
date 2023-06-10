import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { CreateProjectDTOStub } from '../../test/stubs';
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
        it('should be able to create a project and save to database', async () => {
            const ownerId = new Types.ObjectId().toString();
            const dto = CreateProjectDTOStub();

            const newProject = await service.create(ownerId, dto);

            expect(newProject.ownerId.toString()).toBe(ownerId);
            expect(newProject.title).toBe(dto.title);
            expect(newProject.description).toBe(dto.description);
        });
    });
});
