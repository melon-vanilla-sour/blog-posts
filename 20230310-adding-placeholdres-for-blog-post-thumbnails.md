---
title: Adding Placeholders For Blog Post Thumbnails
category: programming
tags:
  - blog
  - programming
created: 2023-03-10
---

The slowest thing that loads on this blog are the images in each post. (This is currently true as of writing this post but probably not by the time I implement what's written here). The main problem is that images pop into white space as they load in and trigger a cumulative layout shift as they do so which can both be kinda jarring. This can be solved by putting a low resolution placeholder where the images would be. In this post I'm going to go through how to implement this using the plaiceholder library. The preliminary information regarding how this next.js blog is setup can be found in the post below.

First install the plaiceholder library. This library takes an image and outputs data to create a blurry placeholder in different ways including css, svgs and blurhashes.

```bash
$ npm install plaiceholder @plaiceholder/next
```

The placeholder images should be generated at build time so we can write the code in `getStaticProps`. I'm using the base64 method of creating a placeholder image so I extract `base64, img` from the `getPlaiceholder()` method.

```typescript
// src/pages/post/[slug].tsx
export const getStaticProps = async ({ params }: { params: { slug: string } }) => {
  const items = await getPostEntries()
  const post = items.find((item) => {
    // Find a particular blog post to render
    return item.fields.slug == params.slug
  })
  const plaiceholders = {}
  await Promise.all(
    // Go through all content blocks in the post and make a placeholder if it's an image (embedded asset block)
    post.fields.content.content.map(async (content) => {
      if (content.nodeType == 'embedded-asset-block') {
        const { base64, img } = await getPlaiceholder(
          'https://' + content.data.target.fields.file.url
        )
        // Store the data to generate the placeholder into an object with a unique key to the retrieve later
        plaiceholders[content.data.target.sys.id] = { ...img, blurDataURL: base64 }
      }
    })
  )
  // Pass the post and plaiceholder data to the render function
  return {
    props: {
      post: post,
      plaiceholders: plaiceholders,
    },
  }
}
```

Inside the component function I pass plaiceholders as an option to the `renderOptions` function so I can use the data inside.

```typescript
const Post = ({ post, plaiceholders }) => {
  return <div>{documentToReactComponents(post.fields.content, renderOptions(plaiceholders))}</div>
}
```

Finally in the render options, I configure the image to be outputted as a next/image. When `placeholder="blur"` is present in a next/image, it conveniently uses the `blurData` property to display a blurred placeholder whilst the original image loads. This is where we previously set the data prepared by plaiceholder.

```typescript
import Image from 'next/image'
[BLOCKS.EMBEDDED_ASSET]: (node, children) => {
let { src, ...imageProps } = plaiceholders[node.data.target.sys.id]
// for some reason an extra // is appended to the image url
src = src.replace('//', '')
return <Image {...imageProps} src={src} placeholder="blur" priority="true" />
},
```

An additional consideration is whether or not to make the images load lazily. Next images load lazy by default which conserves bandwidth and processing power on images that never show up on the screen. The downside is that detection of the succeeding image is kinda slow so whilst scrolling, you can quite visibly see the blurry images for a moment before the actual images pop in. Lazy loading is a great consideration for visitors who might not have the best infrastructure but image pop-ins resulted in a laggy feel which felt like too big of a downside to ignore. In the end I opted for `priority="true"` which eager loads every image in a post.
