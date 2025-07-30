import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Buffer } from "buffer";
import { Readable } from "stream";

const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_BUCKET_NAME;

const s3 = new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

// Função para limpar o nome do arquivo
function sanitizeFileName(originalname) {
  return originalname
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "");
}

export async function sendArchive(buffer, originalname, mimetype) {
  try {
    const safeName = sanitizeFileName(originalname);
    const key = `${Date.now()}-${safeName}`;

    const params = {
      Bucket: bucketName,
      Body: buffer,
      Key: key,
      ContentType: mimetype,
    };

    console.log("Enviando para S3 com chave:", key);
    await s3.send(new PutObjectCommand(params));

    return key;
  } catch (error) {
    console.log("Erro ao enviar para S3:");
    throw error;
  }
}

export async function getArchive(key) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const res = await s3.send(new GetObjectCommand(params));

  
  if (res.Body instanceof Readable) {
    return res.Body; 
  } else {
    return Readable.from(res.Body);
  }
}

export async function getVideoUrl(key) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  const signedVideoURL = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return signedVideoURL;
}

export async function deleteArchive(key) {
  if (!key) return;

  try {
    const params = {
      Bucket: bucketName,
      Key: key,
    };
    await s3.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error(`Erro ao deletar a chave ${key} do S3:`, error);
    throw error;
  }
}

export async function getSignedUrlForFile(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}