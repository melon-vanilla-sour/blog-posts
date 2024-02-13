import fs from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"; // ES Modules import
import dotenv from 'dotenv'
dotenv.config()
import tinify from 'tinify'
tinify.key = process.env.TINIFY_API_KEY


const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
}

const client = new S3Client(awsConfig)
const bucketName = process.env.AWS_BUCKET_NAME;

async function uploadImageToS3(imagePath, s3Key) {
  const image = fs.readFileSync(imagePath)
  const params = {
    Bucket: bucketName,
    Key: s3Key,
    Body: image,
    ContentType: 'image',
  };
  try {
    const command = new PutObjectCommand(params)
    const response = await client.send(command)
    console.log(`Image uploaded succesfully: ${response.Location}`)
  } catch (error) {
    console.log(`Error uploading image: ${error.message}`)
  }
}

function findImageReferences(markdownContent) {
  // finds image references in markdown e.g. './images/20990101-weapon-3.jpg'
  const regex = /!\[.*?\]\((\.\/images\/.*?\.(?:jpeg|jpg|png|webp))\)/g;
  const matches = [];

  let match;
  while ((match = regex.exec(markdownContent)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

async function processMarkdownFiles(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(async (file) => {
    const filePath = path.join(directory, file);

    if (fs.statSync(filePath).isDirectory()) {
      // Recursively process subdirectories
      processMarkdownFiles(filePath);
    } else if (file.endsWith('.md')) {
      // Process Markdown files
      let markdownContent = fs.readFileSync(filePath, 'utf-8');
      const imageReferences = findImageReferences(markdownContent);


      for await (const imagePath of imageReferences) {

        const converted = tinify.fromFile(imagePath).convert({ type: ["image/webp"] });
        const extension = await converted.result().extension();

        const extensionRegex = /jpe?g|\.png|\.webp/;
        const originalExt = imagePath.match(extensionRegex)
        const convertedImagePath = imagePath.replace(originalExt, extension)
        await converted.toFile(convertedImagePath);

        const absoluteImagePath = path.join(directory, convertedImagePath);
        const s3Key = `${path.basename(absoluteImagePath)}`;
        await uploadImageToS3(absoluteImagePath, s3Key);
        const s3Url = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
        // Update the Markdown content to use S3 URL or customize as needed
        console.log(imagePath)
        console.log(s3Url)
        markdownContent = markdownContent.replace(imagePath, s3Url);
      }

      // Update the Markdown file with new image references
      fs.writeFileSync(filePath, markdownContent, 'utf-8');
    }
  });
}

processMarkdownFiles('./')
