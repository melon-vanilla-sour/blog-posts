---
title: Reading Front Matter with gray-matter
category: programming
tags:
  - next.js
  - blog
  - contentful
  - programming
created: 2023-09-29
---

A while back I made the transition to [writing my blog posts in markdown format](/post/rendering-rich-text-from-contentful-in-nextjs) to reduce the dependency on any particular CMS. However I still had to input information like tags and categories through Contentful's form. I wanted to include all the meta-information for posts in the front matter so that everything was contained within one markdown file. Below is an example of this post's front matter in yaml.

```yaml
---
title: Reading Front Matter with gray-matter
category: programming
tags:
  - next.js
  - blog
  - contentful
  - programming
created: 2023-09-29
---
```

In order to parse this, I used the [gray-matter](https://www.npmjs.com/package/gray-matter) package. Now the only thing that the Post component depends on is `post.fields.body` which is just the raw markdown string sent down from Contentful. This means I can migrate the markdown files to another source down the line.

```javascript
// the documentation uses import * as matter but that didn't work for me
import matter from 'gray-matter'
const Post = ({ post }) => {
  // retrieving all the fields from the front matter
  const {
    content,
    data: { title = '', category = '', tags = [], created },
  } = matter(post.fields.body)
  return (
    <>
      <Heading>{title}</Heading>
      <HStack>
        <Text>{capitalizeString(category)}</Text>
        <Text>{dayjs(created).format('DD/MM/YYYY')}</Text>
      </HStack>
      <HStack>
        <Text>{tags.join(', ')}</Text>
      </HStack>
      <ReactMarkdown>{content}</ReactMarkdown>
    </>
  )
}
```

Unfortunately a lot of other parts of the blog, like the posts page, still depend on the Contentful API having information like categories and date created. Contentful does provide an API for managing content so the next step is to probably build a pipeline to programatically send posts straight to the CMS from my local environment.
