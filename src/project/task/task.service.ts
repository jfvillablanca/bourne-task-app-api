import { Injectable } from '@nestjs/common';
import { CreateTaskDto, UpdateTaskDto } from '../dto';

@Injectable()
export class TaskService {
    create(createTaskDto: CreateTaskDto) {
        return 'This action adds a new task';
    }

    async findAll(projectId: string) {
        return [];
    }

    findOne(id: number) {
        return `This action returns a #${id} task`;
    }

    update(id: number, updateTaskDto: UpdateTaskDto) {
        return `This action updates a #${id} task`;
    }

    remove(id: number) {
        return `This action removes a #${id} task`;
    }
}