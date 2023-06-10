import { Injectable } from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Injectable()
export class ProjectService {
    create(createProjectDto: CreateProjectDto) {
        return 'This action adds a new project';
    }

    findAll() {
        return `This action returns all project`;
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
