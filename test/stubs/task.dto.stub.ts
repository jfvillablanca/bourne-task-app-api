import { CreateTaskDto } from '../../src/project/dto';

export const CreateTaskDTOStub = (): CreateTaskDto => {
    return {
        title: 'New Task',
        description: 'New Task Description',
        assignedProjMemberId: [],
    };
};
