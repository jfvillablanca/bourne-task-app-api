import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTaskDto, UpdateTaskDto } from '../dto';
import { Project } from '../entities';
import { Task } from '../types';

@Injectable()
export class TaskService {
    constructor(
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
    ) {}

    async create(
        userId: string,
        projectId: string,
        createTaskDto: CreateTaskDto,
    ) {
        try {
            const project = await this.findProject(userId, projectId);

            project.tasks.push(createTaskDto as Task);
            await project.save();

            const newTask = project.tasks.slice(-1)[0];
            return newTask;
        } catch (err) {
            throw new Error(err);
        }
    }

    async findAll(userId: string, projectId: string) {
        const project = await this.findProject(userId, projectId);
        const tasks = project.tasks;

        return tasks;
    }

    async findOne(userId: string, projectId: string, taskId: string) {
        const project = await this.findProject(userId, projectId);
        const task = project.tasks.find((task) => task._id === taskId);
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    async update(
        userId: string,
        projectId: string,
        taskId: string,
        updateTaskDto: UpdateTaskDto,
    ) {
        const project = await this.findProject(userId, projectId);
        const taskIndex = project.tasks.findIndex(
            (task) => task._id === taskId,
        );
        if (taskIndex < 0) throw new NotFoundException('Task not found');

        const oldTask = project.toObject().tasks[taskIndex];
        const updatedTask = this.updateSubdocument(oldTask, updateTaskDto);
        project.tasks[taskIndex] = updatedTask;

        await project.save();
        return project.tasks[taskIndex];
    }

    async remove(userId: string, projectId: string, taskId: string) {
        const project = await this.findProject(userId, projectId);
        const taskIndex = project.tasks.findIndex(
            (task) => task._id === taskId,
        );
        if (taskIndex < 0) throw new NotFoundException('Task not found');

        project.tasks.splice(taskIndex, 1);
        await project.save();
    }

    private async findProject(userId: string, projectId: string) {
        const project = await this.projectModel.findById(projectId);
        if (!project) {
            throw new NotFoundException('Project not found');
        }

        const { ownerId, collaborators } = project;
        const isCollaborator = collaborators.some((collab) => {
            return userId === collab.toString();
        });
        const isOwner = ownerId.toString() === userId;

        if (!isOwner && !isCollaborator) {
            throw new ForbiddenException(
                'Invalid credentials: Cannot update resource',
            );
        }

        return project;
    }

    private updateSubdocument<T>(oldSubdoc: T, updatedSubdoc: T) {
        const updatedSubdocument: T = { ...oldSubdoc };

        for (const key in updatedSubdoc) {
            if (updatedSubdoc.hasOwnProperty(key)) {
                updatedSubdocument[key] = updatedSubdoc[key];
            }
        }

        return updatedSubdocument;
    }
}
