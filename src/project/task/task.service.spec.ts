import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { CreateProjectDTOStub } from '../../../test/stubs';
import { CreateTaskDTOStub } from '../../../test/stubs/task.dto.stub';
import { UpdateTaskDto } from '../dto';
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
            const ownerId = new Types.ObjectId().toHexString();
            const dto = CreateProjectDTOStub();

            projectId = (await projectService.create(ownerId, dto)).id;
        });

        it('should throw an error if projectId is invalid or not found', async () => {
            const bogusProjectId = new Types.ObjectId().toHexString();

            await expect(taskService.findAll(bogusProjectId)).rejects.toThrow(
                /Project not found/,
            );
        });

        it('should throw an error if projectId is invalid or not found', async () => {
            const bogusProjectId = new Types.ObjectId().toHexString();
            const bogusTaskId = new Types.ObjectId().toHexString();

            await expect(
                taskService.findOne(bogusProjectId, bogusTaskId),
            ).rejects.toThrow(/Project not found/);
        });

        it('should return an empty tasks array for new project', async () => {
            const foundTasks = await taskService.findAll(projectId);
            expect(foundTasks).toStrictEqual([]);
        });

        it('should return a task array with one Task element', async () => {
            const dto = CreateTaskDTOStub();
            const newTask = await taskService.create(projectId, dto);

            const foundTasks = await taskService.findAll(projectId);

            expect(foundTasks).toHaveLength(1);
            expect(foundTasks[0]._id).toStrictEqual(newTask._id);
        });

        it('should throw an error if taskId is invalid or not found', async () => {
            const bogusTaskId = new Types.ObjectId().toHexString();

            await expect(
                taskService.findOne(projectId, bogusTaskId),
            ).rejects.toThrow(/Task not found/);
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
    });

    describe('Create task', () => {
        let projectId: string;

        beforeEach(async () => {
            const ownerId = new Types.ObjectId().toHexString();
            const dto = CreateProjectDTOStub();

            projectId = (await projectService.create(ownerId, dto)).id;
        });

        it('should throw an error if projectId is invalid or not found', async () => {
            const bogusProjectId = new Types.ObjectId().toHexString();

            await expect(
                taskService.create(bogusProjectId, CreateTaskDTOStub()),
            ).rejects.toThrow(/Project not found/);
        });

        it('should throw an error on for malformed dto/invalid data', async () => {
            const invalidDto = { ...CreateTaskDTOStub(), title: '' };

            await expect(
                taskService.create(projectId, invalidDto),
            ).rejects.toThrow(/ValidationError/);
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

    describe('Update task', () => {
        let projectId: string;
        let taskId: string;

        beforeEach(async () => {
            const ownerId = new Types.ObjectId().toHexString();

            projectId = (
                await projectService.create(ownerId, CreateProjectDTOStub())
            ).id;
            taskId = (await taskService.create(projectId, CreateTaskDTOStub()))
                ._id;
        });

        it('should throw an error if projectId is invalid or not found', async () => {
            const nonExistentProjectId = new Types.ObjectId().toHexString();
            const nonExistentTaskId = new Types.ObjectId().toHexString();

            await expect(
                taskService.update(
                    nonExistentProjectId,
                    nonExistentTaskId,
                    CreateTaskDTOStub(),
                ),
            ).rejects.toThrow(/Project not found/);
        });

        it('should throw an error if taskId is invalid or not found', async () => {
            const nonExistentTaskId = new Types.ObjectId().toHexString();

            await expect(
                taskService.update(
                    projectId,
                    nonExistentTaskId,
                    CreateTaskDTOStub(),
                ),
            ).rejects.toThrow(/Task not found/);
        });

        it('should return the updated task if valid and saved to db', async () => {
            const dto: UpdateTaskDto = {
                ...CreateTaskDTOStub(),
                title: 'Updated task',
            };

            const updatedTask = await taskService.update(
                projectId,
                taskId,
                dto,
            );
            const updatedTaskReadFromDb = await taskService.findOne(
                projectId,
                taskId,
            );

            expect(updatedTask._id).toBe(taskId);
            expect(updatedTask.title).toBe(dto.title);
            expect(updatedTaskReadFromDb._id).toBe(updatedTask._id);
            expect(updatedTaskReadFromDb.title).toBe(dto.title);
        });
    });
});
