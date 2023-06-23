import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './entities';
import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { User, UserSchema } from '../user/entities';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Project.name, schema: ProjectSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [ProjectController, TaskController],
    providers: [ProjectService, TaskService],
})
export class ProjectModule {}
