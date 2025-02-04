import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as AWS from 'aws-sdk';

import { randomUUID } from 'crypto';

@Injectable()
export class S3FileUploaderService {
  private readonly s3: AWS.S3;
  private readonly awsRegion: string = process.env.AWS_BUCKET_REGION;
  private readonly awsAccessKey: string = process.env.AWS_ACCESS_KEY;
  private readonly awsSecretKey: string = process.env.AWS_SECRET_KEY;
  private readonly awsS3BucketName: string = process.env.S3_BUCKET_NAME;

  constructor() {
    this.s3 = new AWS.S3({
      region: this.awsRegion,
      accessKeyId: this.awsAccessKey,
      secretAccessKey: this.awsSecretKey,
      // signatureVersion: 'v4',
    });
  }

  async uploadFileToS3(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new HttpException(
        'Debe ingresar mínimo un documento',
        HttpStatus.CONFLICT,
      );
    }

    const uploadPromises = files.map((file) => {
      const { originalname, buffer, size, mimetype } = file;
      const uniquePrefix = randomUUID();
      const uniqueFileName = `${process.env.WEB_PORTAL_NAME_URL}/${uniquePrefix}-${originalname}`;

      const params = {
        Bucket: this.awsS3BucketName,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: mimetype,
        ContentDisposition: 'inline',
        // ACL: 'public-read',
        Metadata: {
          originalName: originalname,
          uniqueFileName: uniqueFileName,
          uniqueIdentifier: uniquePrefix,
          fileType: mimetype.split('/')[1],
          fileSize: `${size} bytes`,
          uploadDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        },
        CreateBucketConfiguration: {
          LocationConstraint: this.awsRegion,
        },
      };

      return this.s3
        .upload(params)
        .promise()
        .then((s3Response) => s3Response.Key);
    });

    try {
      const filesLocationInS3 = await Promise.all(uploadPromises);

      return filesLocationInS3;
    } catch (error) {
      throw new HttpException(
        `Error: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async viewFileFromS3(key: string[]): Promise<string[]> {
    if (!Array.isArray(key)) {
      key = [key];
    }

    if (!key || key.length === 0) {
      throw new HttpException(
        'Debe ingresar mínimo una Key',
        HttpStatus.CONFLICT,
      );
    }

    const urlPromises = key?.map(async (key) => {
      const params = {
        Bucket: this.awsS3BucketName,
        Key: key,
        Expires: 60 * +process.env.MAXIMUM_FILE_PREVIEW_TIME_IN_MINUTES,
      };

      try {
        const url = await this.s3.getSignedUrlPromise('getObject', params);

        return url;
      } catch (error) {
        throw new HttpException(
          `La Key: ${key} tiene error: ${error}`,
          HttpStatus.NOT_FOUND,
        );
      }
    });

    try {
      const urls = await Promise.all(urlPromises);

      if (urls) {
        return urls;
      } else {
        throw new HttpException(
          'No hay documentos anexados',
          HttpStatus.NOT_FOUND,
        );
      }
    } catch (error) {
      throw new HttpException(`Error: ${error}`, HttpStatus.BAD_REQUEST);
    }
  }
}
