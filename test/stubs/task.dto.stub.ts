import { CreateTaskDto } from '../../src/project/dto';

export const CreateTaskDTOStub = (): CreateTaskDto => {
    return {
        title: 'New Task',
        taskState: 'todo',
        description: 'New Task Description',
        assignedProjMemberId: [],
    };
};
