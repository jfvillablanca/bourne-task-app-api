import {
    Body, Controller, Delete, Get, Param, Post
} from '@nestjs/common';
import { CreateTaskDto, UpdateTaskDto } from '../dto';
import { TaskService } from './task.service';

@Controller('projects/:projectId/tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) {}

    @Post()
    create(@Body() createTaskDto: CreateTaskDto) {
        return this.taskService.create(createTaskDto);
    }

    @Get()
    findAll(@Param('projectId') projectId: string) {
        return this.taskService.findAll(projectId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.taskService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
        return this.taskService.update(+id, updateTaskDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.taskService.remove(+id);
    }
}
