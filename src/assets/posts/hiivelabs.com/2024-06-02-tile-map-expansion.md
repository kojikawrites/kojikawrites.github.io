---
title:  "Tile Map Expansion"
description: |
  This development log provides an overview of a tile map management system, detailing its architecture and 
  functionality. It serves as a continuation of previous discussions, offering insights into the system’s design and 
  implementation.
author: hiive
categories: gamedev
tags: world-building terrain-generation procedural-generation c-sharp roguelikes
---

For today's devlog, I'll present a high level overview of the tile map management system, as I glossed over a large 
portion of in the previous two posts. If you've not read those yet, I'd recommend at least skimming them before 
reading on...

If you've read my previous devlog entries, you'll know that I'm learning Rust by converting some of my pre-existing C# 
code to Rust. I chose the tile map management system first partially on a whim, but mainly because it was the library 
that relied on third party code the least. This meant I could focus on learning the language using code that I was 
already intimately familiar with, and additionally I wouldn't be relying on external code to do the heavy lifting 
(which I would not learn as much from). So what did I learn from this?

I'll go into more detail in a future post, but the TLDR version is that I learned that I hated the borrow checker 
for the first couple of weeks, but after I figured out how to write idiomatic Rust, I found that the resulting code 
was almost enjoyable to write - and it ended up being faster, more memory efficient *and* easier to maintain, so "yay" 
all around. 
Not only that, but the emphasis on unit testing and documentation as a first class citizen of the Rust ecosystem meant 
that the resulting code actually worked better too. I managed to eliminate a long-standing bug that had in the original 
C# version. I've no idea how I did it, but the unit tests showed that the Rust version did not have the same bug. 
That same test would have failed on the C# version. (For those interested, the bug was to do with how chunk boundaries 
were populated based on the order of chunk generation.)

The original C# implementation was based on four classes, shown here in order of area of smallest to largest concern.

1. `ChunkTile<T>`
2. `Chunk<T>`
3. `ChunkLayer<T>`
4. `ChunkManager<T>`

## `ChunkTile<T>`
For the sake of this discussion, we can ignore the `ChunkTile<T>` class, which represented a single positioned tile, 
and just treat it as a direct instance of `T`. It was only introduced for debugging purposes, and was slated for 
removal prior to the decision to switch to Rust. (The class maintained additional redundant state information that was 
useful for ensuring that tiles got put in the right place while the code was originally being developed.)

## `Chunk<T>`
The `Chunk<T>` class was responsible for managing a rectangular array of tiles. The width and height of the chunk 
was usually much smaller than the containing layer, with the exception of *layer 0* that only contained one layer-sized 
chunk. As discussed in the previous post, layer *0* represented the top level world map, and subsequent layers *1* to *n* 
contained the procedurally zoomed version of the previous layer, *n-1*. For performance and memory consumption reasons, 
it made sense to have the chunks relatively small (say *128x64*) to ensure that on-the-fly chunk generation was 
manageable in realtime as the player moved around the map.
Note that the chunk is only accessed by its owning layer via the `GetTileAt(int x, int y)` and `SetTileAt(int x, int y)` 
methods. The chunk also has *(x<sub>c</sub>, y<sub>c</sub>)* coordinates that define the offset of the top-left of the 
chunk (which coincide with *(0, 0)* in the chunk frame of reference).

## `ChunkLayer<T>`
The `ChunkLayer<T>` class was responsible for the management of all of the chunks within the layer.  Specifically, it 
would inform the Chunk Manager if it had received a request for a chunk that needed to be generated, and was also 
responsible for managing the layer-specific LRU (Least Recently Used) chunk cache, as well as loading/saving chunks to 
persistent storage on demand.
A layer is only accessed directly by its owning manager via the `GetTileAt(int x, int y)` and `SetTileAt(int x, int y)` 
methods. These methods take in coordinates in the layer's frame of reference, calculate the correct chunk to address, 
and adjust the coordinates to offset into the chunk correctly.
When a chunk is accessed, the layer first checks to see if it is in its LRU Cache. If it is not, then it checks to see 
if it's in the persistent storage. If not, then a callback is made to the owning layer to generate the chunk.

Once the chunk is retrieved/loaded/generated it is moved to the top of the layer's LRU Cache (which by default holds 
64 chunks). When a chunk is evicted from the LRU, it is passed off to a thread that upserts it into the storage 
medium, keyed by *(x<sub>c</sub>, y<sub>c</sub>, ℓ)* representing the coordinates and layer of the chunk being stored.

## `ChunkManager<T>`
This was the main class for interacting with the map. On instantiation, it took the generated source map as a 
parameter, as well as maximum number of layers, and chunk width and height.

Internally it managed the zoom layers of the map and the two main methods used were:

`GetTileAt(int x, int y, int layer)` and `SetTileAt(int x, int y, int layer, T tile)`

When either of these methods were called, the request would be passed to the relevant layer that would then retrieve or 
generate the target chunk and perform the requested operation.

The chunk generation process itself was touched upon in a previous post, but let's talk about it here too.
Let's assume that we are requesting a tile at coordinates *(x<sub>c</sub>, y<sub>c</sub>, ℓ) = (10, 10, 4)* from a 
chunk manager of layer depth 5 (layers *0* to *4*), initialized with a pre-created top level map in layer *0*.
The internal process would be something like the following:

- Request the tile at position *(10, 10)* from layer *4*.
    - Check if the containing chunk exists.
        - If it does, return the tile.
        - If it doesn't, notify the manager that this chunk needs to be generated.

Let's look in more detail at the second case here, assuming that *no* chunks other than the top layer have been 
initialized.

- The chunk manager queries layer *3* for the chunk(s) that will be procedurally expanded into the missing layer *4* 
    chunk. These chunks also do not exist, so layer *3* informs the manager that it needs generation. The chunk manager 
    then queries layer *2* and the process is repeated, and so on, until layer *0* is queried by layer *1*. Layer *0* is 
    fully populated, so at that point, the missing layer *1* chunk is generated using layer *0* as the source, which then 
    becomes immediately available for the missing layer *2* chunk, which then becomes immediately available... You see 
    where I'm going with this, right?

In a nutshell, when a chunk needs to be generated, it's pushed onto a stack until all chunks that it depends upon have 
been created (also pushed onto the stack), and then popped off one-by-one until the stack is empty.

It sounds complicated, but it's really not that bad. It's simply just a chained process of deferring work items until 
the dependent work items have been completed.

In practice, it's a fairly efficient process, due to the fact that chunks are only generated once, combined with the 
fact that chunks in each layer correspond to four chunks in the next layer. A bunch of complicated notation aside, 
this boils down to the upper bounds of chunk generation being proportional to *O(log(ℓ))*.

Combined with the LRU caching and persistent storage of generated chunks, the end result is an effective way of 
generating huge maps on the fly in an efficient manner.

