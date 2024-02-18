---
title: Rendering Rich Text from Contentful in Next.js
category: programming
tags:
  - next.js
  - blog
  - contentful
  - programming
  - vercel
created: 2022-07-09
---

The post you're reading right now is rich-text  pulled from a Content Management System (CMS) that's transformed into React components. In this post I'm going to explain how I achieved this. Below is a basic overview.

![contentful rendering](https://melon-sour-blog-images.s3.amazonaws.com/20220709-contentful-rendering.jpeg)

First I retrieve the blog post from Contentful using their API.

```javascript
export const getStaticProps = async ({ params }: { params: { slug: string } }) => {
  const { items } = await client.getEntries({
    content_type: 'post',
  })
  const post = items.find((item) => {
    return item.fields.slug == params.slug
  })
  return {
    props: {
      post: post,
    },
  }
}
```

I then used an npm package `@contentful-rich-text-react-renderer` to convert the different nodes to React components.

```html
// Inside Post Function Component
<div>{documentToReactComponents(post.fields.content, renderOptions)}</div>
```

Contentful builds the rich-text with different types of nodes such as paragraphs, headings, embedded assets (like images). The `renderOptions` object allows me to configure exactly how each node type should be rendered into a React component.

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

Here's a simple rule I wrote that tells the rendering process to output a heading component when it sees a node of type `HEADING_2`. Note I'm using Chakra UI which provides me with this particular heading component but you're free to use any JSX or UI library of your choice.
Additionally you can customize the rendering of text marks like bold, italics and code. Below is what I use to render the code blocks in this post.

```javascript
renderMark: {
  [MARKS.CODE]: (text) => {
    text = text.split('\n')
    const language = text.shift()
    text = text.join('\n')
    return (
      <SyntaxHighlighter language={language} style={dracula} showLineNumbers>
        {text}
      </SyntaxHighlighter>
    )
  },
},
```

The way I detect the language is by simply typing it on the first line of the code block in the editor. I extract this and pass it to the Syntax highlighter and remove it from the text so that it doesn't show in the final render.

The full list of nodes and marks that can be used are specified [here](https://www.npmjs.com/package/@contentful/rich-text-react-renderer#:~:text=The%20renderNode%20keys,CODE).
