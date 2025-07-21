import multer from "multer";
// Também revisar configuração do multer para armazenamento na S3 ao invés do disco

const upload = multer({ storage: multer.memoryStorage() });
export default upload;
