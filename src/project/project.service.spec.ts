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

            const {
                data: { projects },
            } = await service.findAll(ownerId);

            expect(projects).toStrictEqual([]);
        });

        it('should find a project owned by a user', async () => {
            const ownerId = new Types.ObjectId().toString();
            const dto = { ...CreateProjectDTOStub(), ownerId };
            await new projectModel(dto).save();

            const {
                data: { userId, projects },
            } = await service.findAll(ownerId);

            expect(userId).toBe(ownerId);
            expect(projects.length).toBe(1);
            expect(projects[0].title).toBe(dto.title);
            expect(projects[0].description).toBe(dto.description);
        });
    });
});
