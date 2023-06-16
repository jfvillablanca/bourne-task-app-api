import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from '@nestjs/common';
import { CreateTaskDto, UpdateTaskDto } from '../dto';
import { TaskService } from './task.service';

@Controller('projects/:projectId/tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @Param('projectId') projectId: string,
        @Body() createTaskDto: CreateTaskDto,
    ) {
        return this.taskService.create(projectId, createTaskDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    findAll(@Param('projectId') projectId: string) {
        return this.taskService.findAll(projectId);
    }

    @Get(':taskId')
    @HttpCode(HttpStatus.OK)
    findOne(
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
    ) {
        return this.taskService.findOne(projectId, taskId);
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
