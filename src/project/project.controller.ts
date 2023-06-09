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
import { GetUser } from '../auth/decorator';
import { JwtGuard } from '../auth/guard';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectService } from './project.service';

@UseGuards(JwtGuard)
@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @GetUser('id') userId: string,
        @Body() createProjectDto: CreateProjectDto,
    ) {
        return this.projectService.create(userId, createProjectDto);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    findAll(@GetUser('id') userId: string) {
        return this.projectService.findAll(userId);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    findOne(@Param('id') projectId: string) {
        return this.projectService.findOne(projectId);
    }

    @Get(':id/members')
    @HttpCode(HttpStatus.OK)
    getProjectMembers(@Param('id') projectId: string) {
        return this.projectService.getProjectMembers(projectId);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    update(
        @GetUser('id') userId: string,
        @Param('id') projectId: string,
        @Body() updateProjectDto: UpdateProjectDto,
    ) {
        return this.projectService.update(userId, projectId, updateProjectDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@GetUser('id') userId: string, @Param('id') projectId: string) {
        return this.projectService.remove(userId, projectId);
    }
}
