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
import { VsComment, VsEmptyHeart, VsFilledHeart, VsLink } from "./icons";

interface ThreadProps {
  agent: Accessor<AtpAgent | undefined>;
  atprotoURI: string;
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
        rootPostURI={atprotoURI}
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

  // Optimistic UI state for likes
  const [isLiked, setIsLiked] = createSignal(!!post.post.viewer?.like);
  const [likeCount, setLikeCount] = createSignal(post.post.likeCount ?? 0);

  const showContinueThread =
    (post.post?.replyCount ?? 0) > 0 &&
    (post.replies?.length ?? 0) === 0 &&
    post.showChildReplyLine === false;

  const handleLikeClick = async () => {
    // Optimistic UI update
    const wasLiked = isLiked();
    setIsLiked(!wasLiked);
    setLikeCount(wasLiked ? likeCount() - 1 : likeCount() + 1);

    // Perform API call
    try {
      if (wasLiked) {
        await agent()?.deleteLike(post.post.viewer!.like!);
      } else {
        await agent()?.like(post.post.uri, post.post.cid);
      }
      // Delay refetch to allow server to process the change
      setTimeout(() => refetch(), 1000);
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeCount(wasLiked ? likeCount() + 1 : likeCount() - 1);
    }
  };

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
              <VsComment />
              <span class="ml-1 text-sm">{post.post.replyCount ?? 0}</span>
            </button>
            <button
              type="button"
              class="comments-thread-post-button"
              aria-label="Like"
              onClick={handleLikeClick} >
              {isLiked() ?
                  <VsFilledHeart /> :
                  <VsEmptyHeart />}
              <span class="ml-1 text-sm">{likeCount()}</span>
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
