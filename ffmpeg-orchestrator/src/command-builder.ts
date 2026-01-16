import { CommandOptions } from './types';

/**
 * CommandBuilder - Constructor seguro de comandos FFmpeg
 * Previene inyección de comandos usando arrays en lugar de concatenación de strings
 */
export class CommandBuilder {
  static buildTrimCommand(inputPath: string, outputPath: string, start: number, end: number): string[] {
    const duration = Math.max(0, end - start);
    if (duration <= 0) {
      throw new Error('Duration must be greater than zero');
    }

    return [
      '-y', // Overwrite output files without asking
      '-ss', start.toFixed(3), // Seek to start time
      '-i', inputPath, // Input file
      '-t', duration.toFixed(3), // Duration to capture
      '-c', 'copy', // Copy streams without re-encoding
      '-copyts', // Copy timestamps
      '-avoid_negative_ts', 'make_zero', // Avoid negative timestamps
      outputPath, // Output file
    ];
  }

  static buildConcatCommand(inputFiles: string[], outputPath: string): string[] {
    // Create a temporary file list for FFmpeg
    const fileListContent = inputFiles
      .map(file => `file '${file.replace(/'/g, "'\\''")}'`) // Properly escape quotes
      .join('\n');
    
    // In a real implementation, this would be written to a temporary file
    // For now, we return the args for a concat operation
    return [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-protocol_whitelist', 'file', // Only allow file protocol for security
      '-i', 'file_list.txt', // This would be the path to the file containing the list
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ];
  }

  static buildTranscodeCommand(inputPath: string, outputPath: string, options: { 
    quality?: 'low' | 'medium' | 'high';
    width?: number;
    height?: number;
    videoBitrate?: number;
    audioBitrate?: number;
  } = {}): string[] {
    const args: string[] = ['-y', '-i', inputPath];
    
    // Video options
    if (options.width || options.height) {
      const width = options.width || -1;
      const height = options.height || -1;
      args.push('-vf', `scale=${width}:${height}`);
    }
    
    if (options.videoBitrate) {
      args.push('-b:v', `${options.videoBitrate}k`);
    }
    
    // Quality-specific settings
    switch (options.quality) {
      case 'high':
        args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18');
        break;
      case 'medium':
        args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '23');
        break;
      case 'low':
        args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '28');
        break;
      default:
        args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '23');
    }
    
    // Audio options
    if (options.audioBitrate) {
      args.push('-b:a', `${options.audioBitrate}k`);
    }
    
    args.push('-movflags', '+faststart', outputPath);
    
    return args;
  }

  /**
   * Builds a generic FFmpeg command from structured options
   * This is the most flexible approach that can handle complex operations
   */
  static buildCommand(options: CommandOptions): string[] {
    const args: string[] = ['-y']; // Always overwrite output
    
    // Add input files with their options
    for (const input of options.inputs) {
      // Add any input-specific options
      if (input.options) {
        args.push(...input.options);
      }
      args.push('-i', input.path);
    }
    
    // Add global options
    if (options.globalOptions) {
      args.push(...options.globalOptions);
    }
    
    // Add output files with their options
    for (const output of options.outputs) {
      // Add any output-specific options
      if (output.options) {
        args.push(...output.options);
      }
      args.push(output.path);
    }
    
    return args;
  }
}