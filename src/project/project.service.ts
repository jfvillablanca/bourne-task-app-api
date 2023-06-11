import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
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
        try {
            const foundProject = await this.projectModel
                .findById(projectId)
                .exec();
            return foundProject;
        } catch {
            return Promise.reject(new NotFoundException('Project not found'));
        }
    }

    async update(
        userId: string,
        projectId: string,
        updateProjectDto: UpdateProjectDto,
    ) {
        const { ownerId } = await this.projectModel.findById(projectId);

        const isOwner = ownerId.toString() === userId;
        if (!isOwner) {
            throw new ForbiddenException(
                'Invalid credentials: Cannot update resource',
            );
        }

        const projectDetails = { ...updateProjectDto, ownerId: userId };
        try {
            const updatedProject = await this.projectModel.findByIdAndUpdate(
                projectId,
                projectDetails,
                { new: true },
            );
            return updatedProject;
        } catch (err) {
            throw new Error(err);
        }
    }

    remove(id: number) {
        return `This action removes a #${id} project`;
    }
}
