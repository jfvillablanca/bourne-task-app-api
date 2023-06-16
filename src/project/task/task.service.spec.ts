import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { CreateProjectDTOStub } from '../../../test/stubs';
import { CreateTaskDTOStub } from '../../../test/stubs/task.dto.stub';
import { Project, ProjectSchema } from '../entities';
import { ProjectService } from '../project.service';
import { TaskService } from './task.service';

describe('TaskService', () => {
    let taskService: TaskService;
    let projectService: ProjectService;
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
                TaskService,
                ProjectService,
                {
                    provide: getModelToken(Project.name),
                    useValue: projectModel,
                },
            ],
        }).compile();

        taskService = module.get<TaskService>(TaskService);
        projectService = module.get<ProjectService>(ProjectService);
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

    describe('Find task', () => {
        let projectId: string;

        beforeEach(async () => {
            const ownerId = new Types.ObjectId().toString();
            const dto = CreateProjectDTOStub();

            projectId = (await projectService.create(ownerId, dto)).id;
        });

        it('should return an empty tasks array for new project', async () => {
            const foundTasks = await taskService.findAll(projectId);
            expect(foundTasks).toStrictEqual([]);
        });

        it('should find a specific task by task id and project id', async () => {
            const dto = CreateTaskDTOStub();
            const taskToFind = await taskService.create(projectId, dto);

            const foundTask = await taskService.findOne(
                projectId,
                taskToFind._id,
            );

            expect(foundTask._id).toBe(taskToFind._id);
        });
    describe('Create task', () => {
        let projectId: string;

        beforeEach(async () => {
            const ownerId = new Types.ObjectId().toString();
            const dto = CreateProjectDTOStub();

            projectId = (await projectService.create(ownerId, dto)).id;
        });

        it('should return task details on successful creation', async () => {
            const dto = CreateTaskDTOStub();

            const createdTask = await taskService.create(projectId, dto);

            expect(createdTask.title).toBe(dto.title);
            expect(createdTask.description).toBe(dto.description);
            expect(createdTask.assignedProjMemberId).toStrictEqual(
                dto.assignedProjMemberId,
            );
        });
    });
});
