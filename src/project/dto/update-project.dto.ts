import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateProjectDto } from '.';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsOptional()
    collaborators?: string[];
}
