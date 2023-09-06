import { CreateTaskDto } from '../../src/project/dto';

export const CreateTaskDTOStub = (): CreateTaskDto => {
    return {
        title: 'New Task',
        taskState: 'todo',
        assignedProjMemberId: [],
    };
};
