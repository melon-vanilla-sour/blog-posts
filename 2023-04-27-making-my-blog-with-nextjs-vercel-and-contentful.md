It's pretty much a rite of passage for new developers to make a tech blog that's rarely updated so here's my personal attempt at it. I had to build a lot of seemingly simple features that would otherwise be included in most blogging frameworks e.g. a list of posts according to categories, so it was a great learning experience that I could recommend as a beginner-level project.

## Overview

![blog diagram](//images.ctfassets.net/vt3fzpmlfg71/7qkzrpXxxj2XL7738g4tYw/bc87ac26e9cb8359af391427b8c8b05d/blogdiagram__1_.png)

I used Contentful for my headless CMS and Next.js as the framework for coding my blog. Builds are automatically triggered when either new commits are pushed to Github or when entries are published to Contentful. I used Vercel to statically build the site and host it.

My main goal was to make a site that was really fast. I knew the pain of navigating painfully sluggish websites so I did a bit of research and ended up deciding on making a static site. Originally, single-page applications (SPAs - like Twitter or Facebook) would have the fastest transitions on browser-side transitions with instantaneous app-like feedback but the downside is that their first load takes longer due to the large JavaScript overhead that's needed to create the page. Next.js smartly solves this by building every page that doesn't need dynamic responses into static html and prefetches any internal link that's displayed on the first page.

If you open Chrome dev tools on this page, disable the cache in the network tab and reload the posts page of this blog, you can observe how the JavaScript for connecting pages are loaded as well as JSON when hovering over posts.

![ss_nextjs_prefetch_blog](//images.ctfassets.net/vt3fzpmlfg71/5e6sPt6MRLP2OL9YavveWd/47fb8241786753b22f2f7d60a59bac0b/prefetch-nextjs-blog.png)

## Getting Started

The minimum idea for the blog was a posts page that would pull down posts from Contentful and display them in a grid. I first installed the necessary dependencies.

```bash
$ npm install next react react-dom

# Used for obtaining content
$ npm install contentful


# My preferred css framework but you're free to use whatever
$ npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

I created a space on Contentful for the blog, and a content model that serves as a structure for posts.

![ss-contentful-content-model](//images.ctfassets.net/vt3fzpmlfg71/5wgLG4e2v0a6m4ThVOWKXb/22729ed2af680f286cd45716cb010f61/contentful-content-model.png)

I then created an access token for the Content Delivery API and saved that as an environment variable (I used dotenv for this). Below's the code for creating a client that can invoke methods to access the data from the space.

```javascript
import { createClient } from 'contentful'
export const buildClient = () => {
  const client = createClient({
    space: process.env.CF_SPACE_ID || '',
    accessToken: process.env.CF_ACCESS_TOKEN || '',
  })
  return client
}
```

## Creating the Posts Page

Inside Next.js, under src/pages I made two directories, post/[slug].tsx and posts/[page].tsx. Next automatically creates a route for anything inside the pages directory and the square brackets indicate a dynamic route which means a route who's url will change depending on some factors. In this case the posts page will have a variable number that indicates the pagination and each unique post page will have it's slug in the url. The intent is for the first posts page to have a url like melonsour.com/posts/1 that shows a list of posts. Clicking on any of them will transition to the actual post with a url like melonsour.com/post/the-slug-of-the-post.

I first made the page that displayed a list of posts. Next has two methods that's used for creating static content, `getStaticPaths` and `getStaticProps`. When `getStaticPaths` is used in a page with dynamic routes, Next pre-renders all the paths that are specified in the method. The methods returns an array named path which is populated with
`{ params: { <key>:<some value>} }` objects where the key is the variable used in dynamic route. Each value indicates a path that Next will prepare so in my case I want the array to be filled with
`{ params: { page: '1'} }` for as many posts pages I need. I'm making it so that each pagination shows 10 posts (so if I had less than 10 blog posts I'll need 1 posts page, 11 to 20 blog posts and I'll need 2 pages and so on).

```javascript
export const getStaticPaths = async () => {
  const { total } = await getPostEntries({})
  // postsPerPage is 10
  const totalPages = Math.ceil(total / postsPerPage)
  const paths = []
  for (let page = 1; page <= totalPages; page++) {
    paths.push({ params: { page: page.toString() } })
  }

  return {
    paths,
    fallback: false,
  }
}
```

In order to calculate how many pages I need I grab all the posts and divide it by 10. Then I make and push the necessary object to the paths array. Below is how I get the posts using the client and contentful's api for getting entries.

```javascript
const getPostEntries = async (options) => {
  const { items, total } = await client.getEntries({
    content_type: 'post',
    order: '-sys.createdAt',
    ...options,
  })
  return { items, total }
}
```

`getStaticProps` will supply Next with props which it will use to prerender the pages at build time. It's basically a place where I can prepare the data to pass to the function component. The useful thing is that context parameter of the function contains the information from the route parameters we configured earlier.

```javascript
export const getStaticProps = async ({ params }: { params: { page: number } }) => {
  const { items, total } = await getPostEntries({
    skip: (params.page - 1) * postsPerPage,
    limit: postsPerPage,
  })
  const totalPages = Math.ceil(total / postsPerPage)
  return {
    props: { posts: items, totalPages: totalPages, currentPage: params.page },
  }
}
```

I use the skip and limit keys to obtain the correct posts for any particular pagination. For example on page 2, I want to obtain posts 11 to 20 from Contentful. I do that by skipping the first `(2-1)\*10=10` posts and limit the request to the next 10 posts from that point on. Finally I pass all these to the render function below to create a grid of posts that you probably saw right before clicking on this article.

```typescript
function Posts({
  posts,
  totalPages,
  currentPage,
}: {
  posts
  totalPages: number
  currentPage: number
}) {
  return (
    <>
      <Box my={8}>
        <HStack justifyContent="center">
          <Link href="/categories">
            <Button>Categories</Button>
          </Link>
          <Button isDisabled={true}>Tags</Button>
          <Button isDisabled={true}>Archives</Button>
        </HStack>
      </Box>
      <Grid templateColumns={{ base: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }} gap={6}>
        {posts &&
          posts.map((post, index) => (
            <GridItem maxW="420px" margin="0 auto" key={post.sys.id}>
              <Card post={post} index={index}></Card>
            </GridItem>
          ))}
      </Grid>
      <Pagination totalPages={totalPages}></Pagination>
    </>
  )
}
```

(How I render the card for each post and pagination is out of the scope of but you get the general idea). Each card is essentially a link that goes to the paths of each post I prepare in the next section.
Rendering each Post
post
published

Rendering Rich Text from Contentful in Next.js
programming

I've conveniently already written about how I render the content of each post here. Although not in the article, I prepare a path for each post using its slug, this is what the cards link to.

```typescript
export const getStaticPaths = async () => {
  const items = await getPostEntries()
  const paths = items.map((item) => {
    return {
      // @ts-ignore
      params: { slug: item.fields.slug },
    }
  })
  return {
    paths,
    fallback: false,
  }
}
```

Hosting on Vercel
Here's the part where I finally get to realize my efforts. Vercel's made by the creators of Next so they make it really easy to deploy Next projects. I imported the git repository of this blog and Vercel automatically detects the correct settings it needs to install and build the project. The important step is to tell Vercel the necessary environment variables. In local development I set the place ID and access token in a .env file but it's good practice to not commit this to GitHub since it will expose my keys (and by extension access to my Contentful things). When Vercel builds the project, it will read the keys from here instead.
published

ss-vercel-environment-variables

Automatic Rebuilds
By default Vercel will rebuild and host the project whenever I push new commits to the master branch of the remote repository. However I also want the blog to automatically update whenever I post new content. The idea is that you setup url endpoint on Vercel which Contentful will send POST request to on certain content updates. The official docs have a really good guide.
published

contentful-deploy-triggers

By default Contentful triggers a deploy on every save which is totally unnecessary so I unchecked some triggers to create sensible settings.
Conclusion
And there you have it, you're reading a static blog that should load and transition incredibly fast. As you may have picked up from the code, I have to manually code a lot of basic features like pagination from the ground up. As such this is an incredibly fulfilling project since it challenges me to figure out how to code every feature I want on this site going forwards, and I also get the satisfaction of using something I've built myself. If anyone's thinking of a project to escape the dreaded tutorial hell, I fully recommend a blog like the one you're reading right now.
