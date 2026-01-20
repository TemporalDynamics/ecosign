import { MemoryJobQueue } from './queue';
import { JobRepository } from './job-repository';
import { FFmpegProcessor, FFmpegInput, FFmpegOutput } from './processor';
import { CommandBuilder } from './command-builder';
import { Job, JobOptions, JobQueue, Processor } from './types';

export {
  MemoryJobQueue,
  JobRepository,
  FFmpegProcessor,
  CommandBuilder,
  Job,
  JobOptions,
  JobQueue,
  // Core abstraction - implement this for custom processors
  Processor,
  // FFmpeg-specific types
  FFmpegInput,
  FFmpegOutput,
};

/**
 * Creates a new job queue instance
 * @param options Configuration options for the job queue
 * @returns A new instance of JobQueue
 */
export function createJobQueue(options?: {
  ffmpegPath?: string;
  repository?: JobRepository;
}): JobQueue {
  const ffmpegPath = options?.ffmpegPath || 'ffmpeg';
  const repository = options?.repository;
  
  const queue = new MemoryJobQueue(ffmpegPath, repository);
  queue.initialize();
  
  return queue;
}

export default createJobQueue;