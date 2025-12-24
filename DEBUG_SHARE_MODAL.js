// Debugging ShareDocumentModal
// Pegar esto en la consola del browser cuando el modal esté abierto

// 1. Ver qué datos tiene el documento en el modal
console.log('=== DEBUG SHARE MODAL ===');

// 2. Simular lo que hace el componente
const doc = {
  encrypted: true,
  pdf_storage_path: null, // cambiar según lo que veas
  encrypted_path: 'ruta/al/archivo.encrypted', // cambiar según lo que veas
  eco_storage_path: 'ruta/al/eco',
  eco_file_data: 'data...'
};

const hasPdf = !!(doc.encrypted_path || doc.pdf_storage_path);
const hasEco = !!(doc.eco_storage_path || doc.eco_file_data);

console.log('hasPdf:', hasPdf);
console.log('hasEco:', hasEco);
console.log('pdf_storage_path:', doc.pdf_storage_path);
console.log('encrypted_path:', doc.encrypted_path);
console.log('eco_storage_path:', doc.eco_storage_path);

// 3. Verificar selectedFormats (por defecto es ['pdf'])
const selectedFormats = new Set(['pdf']);
let canShare = selectedFormats.size > 0;

for (const format of selectedFormats) {
  if (format === 'pdf' && !hasPdf) {
    console.log('❌ No puede compartir: falta PDF');
    canShare = false;
  }
  if (format === 'eco' && !hasEco) {
    console.log('❌ No puede compartir: falta ECO');
    canShare = false;
  }
}

console.log('canShare final:', canShare);
