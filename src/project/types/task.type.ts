import { SchemaTypes, Types } from 'mongoose';
import { User } from '../../user/entities';

export const TaskSchema = {
    _id: { type: String, default: () => new Types.ObjectId().toHexString() },
    title: { type: String, required: true },
    description: { type: String },
    assignedProjMemberId: {
        type: [{ type: SchemaTypes.ObjectId, ref: User.name }],
    },
};

export type Task = {
    _id?: string;
    title: string;
    description?: string;
    assignedProjMemberId?: string[];
};
