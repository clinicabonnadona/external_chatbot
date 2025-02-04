import AWS from 'aws-sdk';

export class S3FileUploaderService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION,
    });
  }

  async uploadFileToS3(file, documentId) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${documentId}/${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const result = await this.s3.upload(params).promise();
      return { url: result.Location };
    } catch (error) {
      console.error('Error al subir archivo a S3:', error);
      throw new Error('No se pudo subir el archivo a S3.');
    }
  }
}
