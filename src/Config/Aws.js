import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_BUCKET_NAME;

const s3 = await new S3Client({
  region: region,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

export async function sendArchive(buffer, originalname) {
  try {
    const key = `${Date.now()}-${originalname}`;

    const params = {
      Bucket: bucketName,
      Body: buffer,
      Key: key,
      ContentType: "video/mp4",
    };

    await s3.send(new PutObjectCommand(params));

    return key;
  } catch (error) {
    console.log("Erro ao enviar para S3:");
  }
}

export async function getArchive(key) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const res = await s3.send(new GetObjectCommand(params));
  return res.Body;
}

export async function deleteArchive(key) {
  if (!key) return;

  const params = {
    Bucket: bucketName,
    Key: key,
  };
  await s3.send(new DeleteObjectCommand(params));
}
