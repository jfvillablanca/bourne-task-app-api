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
        const projectDetails = { ...createProjectDto, ownerId: userId };
        try {
            const newProject = await new this.projectModel(
                projectDetails,
            ).save();
            return newProject;
        } catch (err) {
            throw new Error(err);
        }
    }

    async findAll(userId: string) {
        const projects = await this.projectModel
            .find({ ownerId: userId })
            .exec();
        return projects;
    }

    async findOne(projectId: string) {
        const foundProject = await this.projectModel.findById(projectId).exec();
        return foundProject;
    }

    update(id: number, updateProjectDto: UpdateProjectDto) {
        return `This action updates a #${id} project`;
    }

    remove(id: number) {
        return `This action removes a #${id} project`;
    }
}
