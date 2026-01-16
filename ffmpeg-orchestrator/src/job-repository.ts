import { Job } from './types';

// Simple in-memory storage - in a real implementation, this would use SQLite, Redis, etc.
const jobStorage: Map<string, Job> = new Map();

export class JobRepository {
  async initialize(): Promise<void> {
    // In a real implementation, this would connect to the database
    console.log('JobRepository initialized');
  }

  async insertJob(job: Job): Promise<void> {
    jobStorage.set(job.id, { ...job });
  }

  async updateJob(job: Job): Promise<void> {
    const existingJob = jobStorage.get(job.id);
    if (existingJob) {
      jobStorage.set(job.id, { ...job, updatedAt: new Date() });
    }
  }

  async getJobById(id: string): Promise<Job | null> {
    return jobStorage.get(id) || null;
  }

  async getAllJobs(): Promise<Job[]> {
    return Array.from(jobStorage.values());
  }

  async deleteJob(id: string): Promise<boolean> {
    return jobStorage.delete(id);
  }

  async clearAll(): Promise<void> {
    jobStorage.clear();
  }
}

export type { Job } from './types';
