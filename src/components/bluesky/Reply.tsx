import { type AtpAgent, RichText } from "@atproto/api";
import {
  type Accessor,
  type Setter,
  Show,
  createEffect,
  createSignal,
} from "solid-js";

import type { ThreadViewPostUI } from "./utils";
import { Button } from "./Button";

interface DialogProps {
  showEditor: Accessor<ThreadViewPostUI | undefined>;
  setShowEditor: Setter<ThreadViewPostUI | undefined>;
  agent: Accessor<AtpAgent | undefined>;
  refetch: () => void;
  rootPostURI: string;
}

export const Reply = ({
  agent,
  showEditor,
  setShowEditor,
  refetch,
  rootPostURI,
}: DialogProps) => {
  const [editorText, setEditorText] = createSignal(new RichText({ text: "" }));
  const [dialog, setDialog] = createSignal<HTMLDialogElement | null>(null);

  // Validation helpers
  const isSubmitDisabled = () => {
    const text = editorText().text.trim();
    return text === '' || editorText().length > 300;
  };
  const isOverLimit = () => editorText().length > 300;
  const isNearLimit = () => editorText().length > 280 && editorText().length <= 300;

  // Helper function to find the root post by walking up the parent chain
  const findRootPost = (post: ThreadViewPostUI): { uri: string; cid: string } => {
    let current = post;
    // Walk up the parent chain until we find the root (no parent)
    while (current.parent && typeof current.parent === 'object' && 'post' in current.parent) {
      current = current.parent as ThreadViewPostUI;
    }
    return {
      uri: current.post.uri,
      cid: current.post.cid
    };
  };

  createEffect(() => {
    if (showEditor()) {
      dialog()?.showModal();
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "auto";
    }
  }, [showEditor]);

  return (
    <Show when={showEditor()}>
      <dialog
        // When user clicks outside of dialog, close it
        onClick={(e) => {
          if (e.target === dialog()) {
            setShowEditor(undefined);
          }
        }}
        // When user presses escape, close it
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setShowEditor(undefined);
          }
        }}
        ref={(el) => setDialog(el)}
        class='comments-reply'>
        <form class="comments-reply-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (agent() && showEditor() !== null) {
              const post = showEditor();
              const root = findRootPost(post);
              await agent()?.post({
                text: editorText().text,
                langs: ["en"],
                reply: {
                  parent: {
                    cid: post?.post.cid ?? "",
                    uri: post?.post.uri ?? "",
                  },
                  root: {
                    cid: root.cid,
                    uri: root.uri,
                  },
                },
              });
              refetch();
              setShowEditor(undefined);
            }
          }}
        >
          <span
            class="comments-reply-editor-text-length"
            classList={{
              'text-yellow-600': isNearLimit(),
              'text-red-600': isOverLimit()
            }}
          >
            {editorText().length} / 300
          </span>
          {isOverLimit() && (
            <div class="text-red-600 text-sm mt-1">
              Comment is too long. Please shorten it to 300 characters or less.
            </div>
          )}
          <textarea
            class="comments-reply-editor"
            name="text"
            placeholder="Post a comment..."
            value={editorText().text}
            onInput={(e) =>
                setEditorText(new RichText({ text: e.currentTarget.value }))
            }
          />
          <div class="comments-reply-editor-controls">
            <Button type="button" onClick={() => setShowEditor(undefined)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled()}>Post Reply</Button>
          </div>
        </form>
      </dialog>
    </Show>
  );
};
