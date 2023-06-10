import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { Project } from './entities';

@Injectable()
export class ProjectService {
    constructor(
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
    ) {}

    async create(userId: string, createProjectDto: CreateProjectDto) {
        const dto = { ...createProjectDto, ownerId: userId };
        const newProject = await new this.projectModel(dto).save();
        return {
            data: newProject,
        };
    }

    async findAll(userId: string) {
        const projects = await this.projectModel
            .find({ ownerId: userId })
            .exec();
        return {
            data: {
                userId,
                projects,
            },
        };
    }

    findOne(id: number) {
        return `This action returns a #${id} project`;
    }

    update(id: number, updateProjectDto: UpdateProjectDto) {
        return `This action updates a #${id} project`;
    }

    remove(id: number) {
        return `This action removes a #${id} project`;
    }
}
