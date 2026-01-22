'use client';

import { z } from 'zod';

export const ExamQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  answer: z.string(),
});

export const ExamFormSchema = z.object({
  courseId: z.string().min(1, 'Course is required.'),
  examName: z.string().min(3, 'Exam name must be at least 3 characters.'),
  startTime: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "A valid start time is required." }),
  endTime: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "A valid end time is required." }),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 minute.'),
  negativeMark: z.coerce.number().min(0, 'Negative mark cannot be negative.'),
  uploadMode: z.enum(['json', 'manual']).default('json'),
  questionsJson: z.string().optional(),
  questions: z.array(ExamQuestionSchema).optional(),
});

export type ExamFormValues = z.infer<typeof ExamFormSchema>;
