import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { GetUser } from '../../auth/decorator';
import { JwtGuard } from '../../auth/guard';
import { CreateTaskDto, UpdateTaskDto } from '../dto';
import { TaskService } from './task.service';

@UseGuards(JwtGuard)
@Controller('projects/:projectId/tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @GetUser('id') userId: string,
        @Param('projectId') projectId: string,
        @Body() createTaskDto: CreateTaskDto,
    ) {
        return this.taskService.create(userId, projectId, createTaskDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    findAll(
        @GetUser('id') userId: string,
        @Param('projectId') projectId: string,
    ) {
        return this.taskService.findAll(userId, projectId);
    }

    @Get(':taskId')
    @HttpCode(HttpStatus.OK)
    findOne(
        @GetUser('id') userId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
    ) {
        return this.taskService.findOne(userId, projectId, taskId);
    }

    @Patch(':taskId')
    @HttpCode(HttpStatus.OK)
    update(
        @GetUser('id') userId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Body() updateTaskDto: UpdateTaskDto,
    ) {
        return this.taskService.update(
            userId,
            projectId,
            taskId,
            updateTaskDto,
        );
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.taskService.remove(+id);
    }
}
