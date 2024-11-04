import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
  } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

const bucketName = process.env.AWS_BUCKET_NAME;

export async function sendArchive(file, name) {
    const key = name + uuidv4(); // retirar e enviar o name como title+code ou T+title+code
    const contentType = file.split(";base64")[0];
    const params = {
      Bucket: bucketName,
      Body: file,
      Key: key,
      ContentType: contentType.substring(5),
    };
  
    await s3.send(new PutObjectCommand(params));
  
    return key;
}

export async function getArchive(key) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  const res = await s3.send(new GetObjectCommand(params));
  const stream = res.Body.transformToString();
  return stream;
}

export async function deleteArchive(key) {
    if (!key) return;
  
    const params = {
      Bucket: bucketName,
      Key: key,
    };
    await s3.send(new DeleteObjectCommand(params));
}