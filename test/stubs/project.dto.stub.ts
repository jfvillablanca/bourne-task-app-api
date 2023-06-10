import { CreateProjectDto, UpdateProjectDto } from '../../src/project/dto';

export const CreateProjectDTOStub = (): CreateProjectDto => {
    return {
        title: 'Project Title Test',
        description: 'Project Description',
    };
};
