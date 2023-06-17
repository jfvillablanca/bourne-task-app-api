import { Injectable, NotFoundException } from '@nestjs/common';
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

    private async findProject(projectId: string) {
        try {
            const project = await this.projectModel.findById(projectId);
            if (!project)
                return Promise.reject(
                    new NotFoundException('Project not found'),
                );
            return project;
        } catch (err) {
            throw new Error(err);
        }
    }

    async create(projectId: string, createTaskDto: CreateTaskDto) {
        const project = await this.findProject(projectId);

        project.tasks.push(createTaskDto as Task);
        await project.save();

        const newTask = project.tasks.slice(-1)[0];
        return newTask;
    }

    async findAll(projectId: string) {
        const project = await this.findProject(projectId);
        const tasks = project.tasks;

        return tasks;
    }

    async findOne(projectId: string, taskId: string) {
        const project = await this.findProject(projectId);
        try {
            const task = project.tasks.find((task) => task._id === taskId);
            if (!task)
                return Promise.reject(new NotFoundException('Task not found'));
            return task;
        } catch (err) {
            throw new Error(err);
        }
    }

    async update(
        projectId: string,
        taskId: string,
        updateTaskDto: UpdateTaskDto,
    ) {
        const project = await this.findProject(projectId);

        try {
            const taskIndex = project.tasks.findIndex(
                (task) => task._id === taskId,
            );
            if (taskIndex < 0)
                return Promise.reject(new NotFoundException('Task not found'));

            const oldTask = project.toObject().tasks[taskIndex];
            const updatedTask = this.updateSubdocument(oldTask, updateTaskDto);
            project.tasks[taskIndex] = updatedTask;

            await project.save();
            return project.tasks[taskIndex];
        } catch (err) {
            throw new Error(err);
        }
    }

    remove(id: number) {
        return `This action removes a #${id} task`;
    }

    private updateSubdocument<T>(oldSubdoc: T, updatedSubdoc: T) {
        return Object.keys(oldSubdoc).reduce((acc, key) => {
            if (updatedSubdoc.hasOwnProperty(key)) {
                acc[key] = updatedSubdoc[key];
            } else {
                acc[key] = oldSubdoc[key];
            }
            return acc;
        }, {} as T);
    }
}
