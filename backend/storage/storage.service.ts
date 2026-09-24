import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StorageService {
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly localUploadsDir: string;
  private readonly useLocal: boolean;

  constructor(private config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID', '');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID', '');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY', '');

    this.useLocal = !accountId || !accessKeyId || !secretAccessKey;

    if (this.useLocal) {
      this.s3 = null;
      this.bucket = '';
      this.publicUrl = config.get<string>('API_URL', 'http://localhost:3001');
      this.localUploadsDir = path.join(process.cwd(), 'uploads');
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    } else {
      this.bucket = config.getOrThrow<string>('R2_BUCKET_NAME');
      this.publicUrl = config.getOrThrow('R2_PUBLIC_URL');
      this.localUploadsDir = '';
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  async upload(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const key = `${folder}/${filename}`;

    if (this.useLocal) {
      const dir = path.join(this.localUploadsDir, folder);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), file.buffer);
      return `${this.publicUrl}/uploads/${key}`;
    }

    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }
}
