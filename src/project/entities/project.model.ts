import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { User } from '../../user/entities';
import { Task, TaskSchema } from '../types';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true })
export class Project {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true, type: SchemaTypes.ObjectId, ref: User.name })
    ownerId: string;

    @Prop({
        required: true,
        type: [{ type: SchemaTypes.ObjectId, ref: User.name }],
        default: [],
    })
    collaborators: string[];

    @Prop({
        required: true,
        type: [String],
        default: ['todo', 'doing', 'done'],
    })
    taskStates: string[];

    @Prop({
        required: true,
        type: [TaskSchema],
        default: [],
    })
    tasks: Task[];

    createdAt: Date;
    updatedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
