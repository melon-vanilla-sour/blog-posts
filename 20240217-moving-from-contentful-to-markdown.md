---
title: Moving from Contentful to Markdown
category: programming
tags:
  - next.js
  - blog
  - contentful
  - programming
created: 2024-02-17
---

In the [previous update for my blog](https://www.melonsour.com/post/transferring-content-from-rich-text-to-markdown), I converted the input format of posts from rich text to markdown. However I still used Contentful as a CMS which felt restricting particularly regarding how images are all stored in the proprietary platform. Therefore I decided to make the jump to completely storing posts in markdown format so that I could use vim for editing and github for content management. Below is the general architecture after the conversion.

![diagram](https://melon-sour-blog-images.s3.amazonaws.com/20240217-blog-markdown-diagram.jpeg)

## New Fetch Tech

The first step was changing the fetching logic to grab from a repository instead of Contentful.

```typescript
// this gets the url for each blog post
export const fetchMarkdownFiles = async (): Promise<MarkdownPost[]> => {
  const repositoryUrl = `https://api.github.com/repos/${process.env.REPOSITORY_URL}/contents`
  const response = await fetch(repositoryUrl, {
    headers: {
      Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN
        }`
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch repository: ${response.statusText}`)
  }

  const contents = await response.json()
  const markdownFiles = contents
    .filter((file) => file.type === 'file' && file.name.endsWith('.md'))
    .map((file) => ({
      path: file.path,
      contentUrl: file.download_url,
    }))

  return markdownFiles
}

// this one gets the actual markdown content
export const fetchMarkdownContent = async (markdownFiles) => {
  const posts = await Promise.allSettled(
    markdownFiles.map(async (url) => {
      const res = await fetch(url.contentUrl)
      const content = await res.text()
      return content
    })
  )
  return posts
}
```

The important part was storing the data into a cache so that it would only download once during the build process.

```javascript
let cachedData

export const getCachedContent = async () => {
  if (cachedData) return cachedData
  const markdownFiles = await fetchMarkdownFiles()
  let markdownContent = await fetchMarkdownContent(markdownFiles)
  markdownContent = markdownContent.reverse()
  cachedData = markdownContent
  return cachedData
}
```

## Processing Images

Since I was no longer relying on an online platform to upload and manage assets, I had to build a pipeline to serve images in blog posts. After some planning I arrived at this.

- Extracting local image urls with regex magic
- Compress them using [tinify](https://tinypng.com/)
- Upload them to a S3 bucket
- Replace the local url in the original post with the S3 url

To do this I wrote a quick javascript script to execute in the blog post directory which I summarized below using some pseudo code.


```javascript
async function processMarkdownFiles(directory) {
  const files = fs.readdirSync(directory);
  files.forEach(async (file) => {
    if filepath is a directory {
      // Recursively process subdirectories
      processMarkdownFiles(filePath);
    } else if (file.endsWith('.md')) {
      let markdownContent = fs.readFileSync(filePath, 'utf-8');
      // finding images with this regex
      // /!\[.*?\]\((\.\/images\/.*?\.(?:jpeg|jpg|png|webp))\)/g;
      const imageReferences = findImageReferences(markdownContent);

      for await (const imagePath of imageReferences) {
        // - compress and convert to jpg using tinify api
        // - upload to s3
        // - replace the original url in markdown with s3 url
      }

      // Update the Markdown file with new image references
      fs.writeFileSync(filePath, markdownContent, 'utf-8');
    }
  });
}
```

With everything done the editing workflow is much better since I have all my usual coding tools to create, edit and deploy posts locally.
