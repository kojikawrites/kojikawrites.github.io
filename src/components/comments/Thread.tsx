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
import { VsComment, VsHeart, VsHeartFilled, VsLink } from "solid-icons/vs";
import {
  type ThreadViewPostUI,
  enrichThreadWithUIData,
  flatten, replaceHashtags,
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
          <p class="comments-thread-post-body" innerHTML={replaceHashtags(text, categories)}></p>
          <div class="comments-thread-post-controls">
            <button
              type="button"
              class="comments-thread-post-button"
              onClick={() => setShowEditor(post)}
              aria-label={`Reply to ${post.post.author.displayName}`} >
              <VsComment />
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
              {post.post.viewer?.like ? <VsHeartFilled /> : <VsHeart />}
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
              <VsLink />{" "}
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
