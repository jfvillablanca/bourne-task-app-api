import { SchemaTypes } from 'mongoose';
import { User } from '../../user/entities';

export const TaskSchema = {
    title: { type: String, required: true },
    description: { type: String },
    assignedProjMemberId: {
        type: [{ type: SchemaTypes.ObjectId, ref: User.name }],
    },
};

export type Task = {
    title: string;
    description?: string;
    assignedProjMemberId?: string[];
};
