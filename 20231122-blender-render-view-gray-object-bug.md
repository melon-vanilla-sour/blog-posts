---
title: Objects Grayed out in Render View Blender
category: digital art
tags:
  - blender
  - digital art
created: 2023-11-22
draft: true
---

I recently ran into a Blender bug that was notoriously difficult to Google so I thought I'd describe the bug in a post.

The issue was that objects were grayed out completely in render view despite the status indication of the render in the top left displaying done. Furthermore this symptom was only present when in the layout tab, the render view in other tabs like shading and texture paint worked just fine. Colors also worked fine in material view, camera view or even an actual render.

Turns out this wasn't due to some setting I had accidentally toggled but a bug to do with the view layer. To fix it, all I had to do was create a new view layer in the top right and delete the 'bugged' layer.
