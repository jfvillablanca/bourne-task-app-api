import { Injectable } from '@nestjs/common';
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

    async create(projectId: string, createTaskDto: CreateTaskDto) {
        const project = await this.projectModel.findById(projectId);

        project.tasks.push(createTaskDto as Task);
        await project.save();

        const newTask = project.tasks.slice(-1)[0];
        return newTask;
    }

    async findAll(projectId: string) {
        const project = await this.projectModel.findById(projectId);
        const tasks =  project.tasks;

        return tasks;
    }

    async findOne(projectId: string, taskId: string) {
        const project = await this.projectModel.findById(projectId);
        const task = project.tasks.find((task) => task._id === taskId);

        return task;
    }

    update(id: number, updateTaskDto: UpdateTaskDto) {
        return `This action updates a #${id} task`;
    }

    remove(id: number) {
        return `This action removes a #${id} task`;
    }
}
