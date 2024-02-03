---
title: Transferring Content from Rich Text to Markdown
category: programming
tags: 
  - next.js
  - programming
  - contentful
  - blog
created: 2023-09-21
---

Transferring Content from Rich Text to Markdown

When I first started building this blog I decided to use Contentful's rich text input option for writing posts. This gave me a WYSIWYG editor that was fairly useable for most writing except for code. Unfortunately the UX for writing code is just terrible since the only thing indicating that a certain part of text is code, is the text becoming a different serif font. What I intended for code blocks sometimes cut off into two piece due to some line break I can't even see, and fixing indentation in the actual editor was an impossible task. My flow was to create and format code in VSCode and paste it only when everything was perfect in the IDE. Even then, this multi-step workflow was suboptimal when I needed to edit code later on. These issues when combined were pretty critical since I was planning to write a lot of code as a tech-based blog.

I brainstormed several solutions, the nuclear option was to migrate from Contentful to another headless CMS with a more useable code editor. I looked through some top options like Sanity which is apparently 'built for developers' but editors aren't usually showcased very well on the websites and there was no way I was going to search through videos of people using CMSs out there. Besides a new CMS means an entirely new API I have to pull and parse the content from and this was a monumental task I didn't have the will power for.

I also considered exporting my existing posts out of Contentful and simply building the static blog with markdown pages. This was kinda attractive since it solved an adjacent issue of vendor lock in that was lingering in my mind. What if I wanted to move out of Contentful down the line? Do I really want build all my content in this proprietary service? Managing all my posts as markdown in a repository felt good, light weight and full control, but the one thing that a CMS provided was the convenience of uploading and hosting images. Managing an image pipeline like formatting and resizing as well as hosting/serving just seemed kinda troublesome based off my shallow research.
I did learn that exporting content out of Contentful was possible albeit in a weird json format that needed parsing when importing.

In the end I settled on using the Markdown editor provided by Contentful. Whilst the Rich text content model output a json that I parsed with this rich text to react library, the Markdown model simply gives a string so I needed another method of converting this to JSX. I opted for [react-markdown](https://www.npmjs.com/package/react-markdown).

(One downside of the swap to markdown is that I lose the option to link to another embedded blog post in the editor. I can still paste a normal link but I lose the information like thumbnails and creation date that was needed to make these neat looking cards.)

A different renderer means I had to rewrite the rendering logic to match the new library. For the most part this wasn't too difficult, the rich text renderer detected different types of blocks (heading, paragraph) and marks (bold, inline code) whilst the markdown renderer detected html elements.

A block for rendering h2's in the previous library.

```javascript
const renderOptions = {
  renderNode: {
    [BLOCKS.HEADING_2]: (node, children) => {
      return (
        <Heading size="md" mb={2} textAlign="start">
          {children}
        </Heading>
      )
    },
  },
}
```

The equivalent conversion in react-markdown.

```javascript
const markdownRenderer = {
  h2: ({ node, ...props }) => <Heading size="md" mb={8} textAlign="start" {...props} />,
}
```

## Images being weird

One tricky bug was that certain paragraph elements after images weren't getting rendered styled, sometimes. I kept getting an error `Warning: validateDOMnesting(...): <div> cannot appear as a descendant of <p>`. Turns out the reason was because all my image elements were getting wrapped in p tags which somehow broke the styling of the rendered react elements. Apparently this behavior is working as intended by remark (the Markdown parsing portion of react-markdown), since Markdown treats blocks of texts as paragraphs, even a singular link to an image. To solve that I used [remark-unwrap-images](https://www.npmjs.com/package/remark-unwrap-images). Using plugins in react-markdown is as easy as importing and passing it to the component.

```jsx
import remarkUnwrapImages from 'remark-unwrap-images'
// ...
return (
  <ReactMarkdown components="{markdownRenderer}" remarkPlugins="{[remarkUnwrapImages]}" skipHtml>
    {post.fields.body}
  </ReactMarkdown>
)
```

To get the placeholders working again, I scanned the text with a regex generated from some GPT magic. After storing the placeholder data with an index, I output them by tracking and incrementing an imageIndex variable outside the scope of the renderer object. Didn't expect this to work but does.

```javascript
export const getStaticProps = async ({ params }: { params: { slug: string } }) => {
  // Grab the correct post data
  const items = await getPostEntries()
  const post = items.find((item) => {
    return item.fields.slug == params.slug
  })
  const plaiceholders = {}

  // matches this regex /(?<=\()\/\/images\.ctfassets\.net\/[^\s]+(?=\))/g
  const imageURLs = getImageUrls(post.fields.body)
  await Promise.all(
    imageURLs.map(async (imageURL, index) => {
      const { base64, img } = await getPlaiceholder(`https:${imageURL}`)
      plaiceholders[index] = { ...img, blurDataURL: base64 }
    })
  )
  return {
    props: {
      post: post,
      plaiceholders: plaiceholders,
    },
  }
}

// Some real jank to print out the images in order
let imageIndex = 0
const markdownRenderer = {
  img: ({ node, src, ...props }) => {
    let { src: imgSrc, ...imageProps } = plaiceholders[imageIndex]
    imageIndex += 1
    return (
      <Flex
        filter={'saturate(110%) brightness(110%)'}
        justifyContent="center"
        borderRadius="10px"
        overflow="hidden"
        mb={8}
      >
        <Image
          src={`${imgSrc}?fm=webp&h=600`}
          {...imageProps}
          priority={true}
          placeholder="blur"
          {...props}
        />
      </Flex>
    )
  },
}
```

## Code Blocks

For the code I pretty much copied the official documentation that covers both code blocks and inline code. The `className` is a neat property that's detected off the language written after the 3 backticks in Markdown. A cool thing was that [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) worked perfectly here as well but I took this oppurtunity to use a [theme from prism](https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/AVAILABLE_STYLES_PRISM.MD) instead of hljs since the former supported jsx.

```javascript
const markdownRenderer = {
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <Box pb={8} borderRadius={10} overflow="hidden">
        <SyntaxHighlighter
          {...props}
          children={String(children).replace(/\n$/, '')}
          style={oneDark}
          language={match[1]}
          PreTag="div"
        />
      </Box>
    ) : (
      <Box
        px={1}
        bg={useColorModeValue('blackAlpha.300', 'gray.700')}
        {...props}
        className={className}
        as="code"
      >
        {children}
      </Box>
    )
  },
}
```

After all was done I can now write posts as regular Markdown with all the tooling that I had before. Storing regular `.md` files in a repository means an easy transfer if I choose to move on from Contentful in the future.
