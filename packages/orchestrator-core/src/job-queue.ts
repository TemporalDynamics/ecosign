export interface JobQueue {
  enqueue(jobId: string): Promise<void>;
  dequeue(): Promise<string | null>;
  acknowledge(jobId: string): Promise<void>;
}
