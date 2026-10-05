import multer from 'multer';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open, rename, unlink } from 'node:fs/promises';

const root = path.resolve(process.env.UPLOAD_DIR || './server/uploads');
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const extensionForMime = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function detectImageMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 6 && (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a')) return 'image/gif';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return '';
}

function makeStorage(folder) {
  const destination = path.join(root, folder);
  mkdirSync(destination, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, destination),
    filename: (_req, _file, callback) => callback(null, `${Date.now()}-${randomBytes(6).toString('hex')}.upload`),
  });
}

function fileFilter(_req, file, callback) {
  if (!allowed.has(file.mimetype)) {
    const error = new Error('Upload a JPG, PNG, WEBP or GIF image.');
    error.status = 400;
    return callback(error);
  }
  callback(null, true);
}

const createUploader = (folder) => multer({
  storage: makeStorage(folder),
  fileFilter,
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

function uploadValidatedImage(folder, field) {
  const receiveFile = createUploader(folder).single(field);
  return (req, res, next) => {
    receiveFile(req, res, async (error) => {
      if (error) return next(error);
      if (!req.file) return next();
      try {
        const fileHandle = await open(req.file.path, 'r');
        const header = Buffer.alloc(12);
        let bytesRead;
        try {
          ({ bytesRead } = await fileHandle.read(header, 0, header.length, 0));
        } finally {
          await fileHandle.close();
        }

        const detectedMime = detectImageMime(header.subarray(0, bytesRead));
        if (!detectedMime || detectedMime !== req.file.mimetype) {
          await unlink(req.file.path).catch(() => {});
          req.file = undefined;
          return res.status(400).json({ message: 'The selected file is not a valid image of its declared type. Choose a JPG, PNG, WEBP or GIF image.' });
        }

        const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${extensionForMime[detectedMime]}`;
        const safePath = path.join(req.file.destination, filename);
        await rename(req.file.path, safePath);
        req.file.filename = filename;
        req.file.path = safePath;
        req.file.mimetype = detectedMime;
        return next();
      } catch (validationError) {
        if (req.file?.path) await unlink(req.file.path).catch(() => {});
        return next(validationError);
      }
    });
  };
}

export const uploadItemImage = uploadValidatedImage('items', 'image');
export const uploadProfileImage = uploadValidatedImage('profiles', 'profileImage');
export const uploadClaimProof = uploadValidatedImage('claims', 'proof');
export const uploadRoot = root;
