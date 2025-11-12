import type { AtpAgent } from "@atproto/api";
import type { ThreadViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import {
  createSignal,
  type Accessor,
  type Component,
  type Setter,
  createResource,
  For,
} from "solid-js";
import { formatDistance } from "date-fns";
import {
  type ThreadViewPostUI,
  enrichThreadWithUIData,
  flatten, replaceHashtagsAndAutoPostText,
} from "./utils";
import { Reply } from "./Reply";

interface ThreadProps {
  agent: Accessor<AtpAgent | undefined>;
  atprotoURI: string;
  handle: string;
  categories: string[];
}

export const Thread: Component<ThreadProps> = ({ atprotoURI, agent, categories }) => {
  const [showEditor, setShowEditor] = createSignal<ThreadViewPostUI>();
  const [highlightedPost, setHighlightedPost] =
    createSignal<string>(atprotoURI);

  const [thread, { refetch }] = createResource<
    ThreadViewPostUI[] | undefined,
    string,
    true
  >(
    () => highlightedPost(),
    async (uri) => {
      if (agent()) {
        const threadResult = await agent()?.getPostThread({
          uri,
          parentHeight: 20,
        });

        const enriched = enrichThreadWithUIData(
          threadResult?.data.thread as ThreadViewPost,
        );

        const enrichedAndFlattened = [...flatten(enriched)];

        return enrichedAndFlattened;
      }
      return undefined;
    },
  );

  return (
    <>
      {thread.state === "pending" && <p>Loading...</p>}
      {thread.state === "errored" && <p>Error: {thread.error.message}</p>}
      {thread() && (
        <ul>
          <For each={thread()}>
            {(post) => (
              <Post
                agent={agent}
                post={post}
                categories={categories}
                refetch={() => refetch()}
                setShowEditor={setShowEditor}
                setHighlightedPost={setHighlightedPost}
              />
            )}
          </For>
        </ul>
      )}
      <Reply
        agent={agent}
        showEditor={showEditor}
        setShowEditor={setShowEditor}
        refetch={refetch}
      />
    </>
  );
};

function getPostId(uri: string) {
  return uri.split("/").pop();
}

const Post = ({
  agent,
  post,
  categories,
  refetch,
  setShowEditor,
  setHighlightedPost,
}: {
  agent: Accessor<AtpAgent | undefined>;
  post: ThreadViewPostUI;
  categories: string[];
  refetch: () => void;
  setShowEditor: Setter<ThreadViewPostUI | undefined>;
  setHighlightedPost: Setter<string>;
}) => {
  const { text, createdAt } = post.post.record as {
    text: string;
    createdAt: string;
  };

  const showContinueThread =
    (post.post?.replyCount ?? 0) > 0 &&
    (post.replies?.length ?? 0) === 0 &&
    post.showChildReplyLine === false;

  return (
    <li
        class="comments-thread-list"
      classList={{
        "comments-thread-list-highlighted-post":  post.isHighlightedPost,
      }}>
      {post.showParentReplyLine ? (
        <div class="flex pt-8 ml-6 border-l-2 border-stone-400 dark:border-stone-600" />
      ) : null}
      <div class="flex flex-col items-start">
        <button
          type="button"
          class="flex flex-row items-center justify-center gap-2"
          onClick={() => setHighlightedPost(post.post.uri)} >
          <img class="comments-thread-avatar"
            src={post.post.author.avatar}
            alt="avatar"
          />
          <span class="comments-thread-display-name">
            {post.post.author.displayName}
          </span>
          <span class="comments-thread-handle">
            @{post.post.author.handle}
          </span>
          <time
            class="comments-thread-created-at"
            dateTime={createdAt} >
            {formatDistance(new Date(createdAt), new Date())}
          </time>
        </button>

        <div
          class={`
          comments-thread-post-wrapper
          ${post.showParentReplyLine ? "comments-thread-parent-reply-line" : ""}
          ${post.showChildReplyLine ? "comments-thread-child-reply-line" : ""}
          `} >
          <p class="comments-thread-post-body highlight-link" innerHTML={replaceHashtagsAndAutoPostText(text, categories)}></p>
          <div class="comments-thread-post-controls">
            <button
              type="button"
              class="comments-thread-post-button"
              onClick={() => setShowEditor(post)}
              aria-label={`Reply to ${post.post.author.displayName}`} >
              <svg id="VsComment" fill="currentColor" stroke-width="0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="1em" width="1em" style="overflow: visible; color: currentcolor; --darkreader-inline-fill: currentColor; --darkreader-inline-color: currentcolor;" data-darkreader-inline-fill="" data-darkreader-inline-color=""><path d="M14.5 2h-13l-.5.5v9l.5.5H4v2.5l.854.354L7.707 12H14.5l.5-.5v-9l-.5-.5zm-.5 9H7.5l-.354.146L5 13.293V11.5l-.5-.5H2V3h12v8z"></path></svg>
              <span class="ml-1 text-sm">{post.post.replyCount ?? 0}</span>
            </button>
            <button
              type="button"
              class="comments-thread-post-button"
              aria-label="Like"
              onClick={async () => {
                if (post.post.viewer?.like) {
                  await agent()?.deleteLike(post.post.viewer.like);
                  refetch();
                } else {
                  await agent()?.like(post.post.uri, post.post.cid);
                  refetch();
                }
              }} >
              {post.post.viewer?.like ?
                  <svg id="VsFilledHeart" fill="currentColor" stroke-width="0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="1em" width="1em" style="overflow: visible; color: currentcolor; --darkreader-inline-fill: currentColor; --darkreader-inline-color: currentcolor;" data-darkreader-inline-fill="" data-darkreader-inline-color=""><path d="M14.88 4.78a3.489 3.489 0 0 0-.37-.9 3.24 3.24 0 0 0-.6-.79 3.78 3.78 0 0 0-1.21-.81 3.74 3.74 0 0 0-2.84 0 4 4 0 0 0-1.16.75l-.05.06-.65.65-.65-.65-.05-.06a4 4 0 0 0-1.16-.75 3.74 3.74 0 0 0-2.84 0 3.78 3.78 0 0 0-1.21.81 3.55 3.55 0 0 0-.97 1.69 3.75 3.75 0 0 0-.12 1c0 .318.04.634.12.94a4 4 0 0 0 .36.89 3.8 3.8 0 0 0 .61.79L8 14.31l5.91-5.91c.237-.232.44-.498.6-.79A3.578 3.578 0 0 0 15 5.78a3.747 3.747 0 0 0-.12-1Z"></path></svg> :
                  <svg id="VsEmptyHeart" fill="currentColor"  stroke-width="0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="1em" width="1em" style="overflow: visible; color: currentcolor; --darkreader-inline-fill: currentColor; --darkreader-inline-color: currentcolor;" data-darkreader-inline-fill="" data-darkreader-inline-color=""><path d="M14.88 4.78a3.489 3.489 0 0 0-.37-.9 3.24 3.24 0 0 0-.6-.79 3.78 3.78 0 0 0-1.21-.81 3.74 3.74 0 0 0-2.84 0 4 4 0 0 0-1.16.75l-.05.06-.65.65-.65-.65-.05-.06a4 4 0 0 0-1.16-.75 3.74 3.74 0 0 0-2.84 0 3.78 3.78 0 0 0-1.21.81 3.55 3.55 0 0 0-.97 1.69 3.75 3.75 0 0 0-.12 1c0 .317.04.633.12.94a4 4 0 0 0 .36.89 3.8 3.8 0 0 0 .61.79L8 14.31l5.91-5.91c.237-.233.44-.5.6-.79A3.578 3.578 0 0 0 15 5.78a3.747 3.747 0 0 0-.12-1zm-1 1.63a2.69 2.69 0 0 1-.69 1.21l-5.21 5.2-5.21-5.2a2.9 2.9 0 0 1-.44-.57 3 3 0 0 1-.27-.65 3.25 3.25 0 0 1-.08-.69A3.36 3.36 0 0 1 2.06 5a2.8 2.8 0 0 1 .27-.65c.12-.21.268-.4.44-.57a2.91 2.91 0 0 1 .89-.6 2.8 2.8 0 0 1 2.08 0c.33.137.628.338.88.59l1.36 1.37 1.36-1.37a2.72 2.72 0 0 1 .88-.59 2.8 2.8 0 0 1 2.08 0c.331.143.633.347.89.6.174.165.32.357.43.57a2.69 2.69 0 0 1 .35 1.34 2.6 2.6 0 0 1-.06.72h-.03z"></path></svg>}
              <span class="ml-1 text-sm">{post.post.likeCount}</span>
            </button>
            <a
              class="comments-thread-post-button"
              href={`https://bsky.app/profile/${
                post.post.author.handle
              }/post/${getPostId(post.post.uri)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on Bsky" >
                <svg id="VsLink" fill="currentColor" stroke-width="0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="1em" width="1em" style="overflow: visible; color: currentcolor; --darkreader-inline-fill: currentColor; --darkreader-inline-color: currentcolor;" data-darkreader-inline-fill="" data-darkreader-inline-color=""><path fill-rule="evenodd" d="M4.4 3h3.085a3.4 3.4 0 0 1 3.4 3.4v.205A3.4 3.4 0 0 1 7.485 10H7V9h.485A2.4 2.4 0 0 0 9.88 6.61V6.4A2.4 2.4 0 0 0 7.49 4H4.4A2.4 2.4 0 0 0 2 6.4v.205A2.394 2.394 0 0 0 4 8.96v1a3.4 3.4 0 0 1-3-3.35V6.4A3.405 3.405 0 0 1 4.4 3zM12 7.04v-1a3.4 3.4 0 0 1 3 3.36v.205A3.405 3.405 0 0 1 11.605 13h-3.09A3.4 3.4 0 0 1 5.12 9.61V9.4A3.4 3.4 0 0 1 8.515 6H9v1h-.485A2.4 2.4 0 0 0 6.12 9.4v.205A2.4 2.4 0 0 0 8.515 12h3.09A2.4 2.4 0 0 0 14 9.61V9.4a2.394 2.394 0 0 0-2-2.36z" clip-rule="evenodd"></path></svg>{" "}
              <span class="ml-1 text-xs">View on Bsky</span>
            </a>
          </div>
          {showContinueThread ? (
            <div>
              <button
                type="button"
                class="comments-thread-continue-thread-button"
                onClick={() => setHighlightedPost(post.post.uri)}
                aria-label={`Reply to ${post.post.author.displayName}`}
              >
                Continue thread...
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
};
