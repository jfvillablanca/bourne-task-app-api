import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/entities';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { Project } from './entities';

@Injectable()
export class ProjectService {
    constructor(
        @InjectModel(Project.name)
        private readonly projectModel: Model<Project>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
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
            .find({
                $or: [
                    { ownerId: userId },
                    { collaborators: { $in: [userId] } },
                ],
            })
            .exec();
        return projects;
    }

    async findOne(projectId: string) {
        const foundProject = await this.projectModel.findById(projectId).exec();
        if (!foundProject) throw new NotFoundException('Project not found');
        return foundProject;
    }

    async getProjectMembers(projectId: string) {
        const foundProject = await this.projectModel.findById(projectId).exec();
        if (!foundProject) throw new NotFoundException('Project not found');

        const memberIds = [foundProject.ownerId, ...foundProject.collaborators];
        const members = await Promise.all(
            memberIds.map(async (userId) => {
                const user = await this.userModel.findById(userId);
                return { _id: user._id, email: user.email };
            }),
        );

        return members;
    }

    async update(
        userId: string,
        projectId: string,
        updateProjectDto: UpdateProjectDto,
    ) {
        const { ownerId, collaborators } = await this.projectModel.findById(
            projectId,
        );

        const isCollaborator = collaborators.some((collab) => {
            return userId === collab.toString();
        });
        const isOwner = ownerId.toString() === userId;

        if (!isOwner && !isCollaborator) {
            throw new ForbiddenException(
                'Invalid credentials: Cannot update resource',
            );
        }

        const projectDetails = { ...updateProjectDto, ownerId };
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

    async remove(userId: string, projectId: string) {
        const { ownerId } = await this.projectModel.findById(projectId);

        const isOwner = ownerId.toString() === userId;

        if (!isOwner) {
            throw new ForbiddenException(
                'Invalid credentials: Cannot delete resource',
            );
        }

        try {
            await this.projectModel.findByIdAndDelete(projectId);
            return;
        } catch (err) {
            throw new Error(err);
        }
    }
}
