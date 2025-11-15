// client/src/lib/fileValidation.ts

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS: { [ext: string]: { mime: string | string[], magic: string[] } } = {
  // Documentos
  'pdf': { mime: 'application/pdf', magic: ['25504446'] }, // %PDF
  'doc': { mime: 'application/msword', magic: ['d0cf11e0a1b11ae1'] }, // OLE
  'docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: ['504b0304'] }, // PKzip
  'xls': { mime: 'application/vnd.ms-excel', magic: ['d0cf11e0a1b11ae1'] }, // OLE
  'xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: ['504b0304'] }, // PKzip
  'ppt': { mime: 'application/vnd.ms-powerpoint', magic: ['d0cf11e0a1b11ae1'] }, // OLE
  'pptx': { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', magic: ['504b0304'] }, // PKzip
  
  // Imagenes
  'jpg': { mime: ['image/jpeg'], magic: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'] },
  'jpeg': { mime: ['image/jpeg'], magic: ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'] },
  'png': { mime: 'image/png', magic: ['89504e47'] },
  'gif': { mime: 'image/gif', magic: ['47494638'] },
  'webp': { mime: 'image/webp', magic: ['52494646'] },
  
  // Archivos Comprimidos
  'zip': { mime: ['application/zip', 'application/x-zip-compressed'], magic: ['504b0304'] },
  'rar': { mime: 'application/vnd.rar', magic: ['52617221'] },

  // .ECO
  'eco': { mime: 'application/octet-stream', magic: ['45434f53'] }, // ECOS
  'ecox': { mime: 'application/octet-stream', magic: ['45434f58'] }, // ECOX
};

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function validateFile(file: File): Promise<ValidationResult> {
  // 1. Check for empty file
  if (file.size === 0) {
    return { valid: false, error: 'El archivo está vacío.' };
  }

  // 2. Check for max file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `El archivo es demasiado grande (max ${MAX_FILE_SIZE_MB} MB).` };
  }

  const extension = getFileExtension(file.name);
  const config = ALLOWED_EXTENSIONS[extension];

  // 3. Check for allowed extension
  if (!config) {
    return { valid: false, error: `El tipo de archivo (.${extension}) no está permitido.` };
  }

  // 4. Check for MIME type match
  const allowedMimes = Array.isArray(config.mime) ? config.mime : [config.mime];
  if (!allowedMimes.includes(file.type)) {
    // Allow generic octet-stream for some types if browser fails to detect
    if (file.type !== 'application/octet-stream') {
       return { valid: false, error: `El tipo MIME del archivo (${file.type}) no coincide con su extensión (.${extension}).` };
    }
  }

  // 5. Check for magic bytes
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (e.target?.readyState === FileReader.DONE) {
        const arrayBuffer = e.target.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer, 0, 8); // Read first 8 bytes
        const hex = bytesToHex(bytes);

        const magicMatches = config.magic.some(magic => hex.startsWith(magic));

        if (!magicMatches) {
          resolve({ valid: false, error: 'El archivo parece estar corrupto o disfrazado (los magic bytes no coinciden).' });
        } else {
          resolve({ valid: true });
        }
      }
    };
    reader.onerror = () => {
        resolve({ valid: false, error: 'No se pudo leer el archivo para validarlo.' });
    };
    reader.readAsArrayBuffer(file);
  });
}
