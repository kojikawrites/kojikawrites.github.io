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
}

export const Reply = ({
  agent,
  showEditor,
  setShowEditor,
  refetch,
}: DialogProps) => {
  const [editorText, setEditorText] = createSignal(new RichText({ text: "" }));
  const [dialog, setDialog] = createSignal<HTMLDialogElement | null>(null);
  const isSubmitDisabled = () => editorText().text.trim() === '';

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
              await agent()?.post({
                text: editorText().text,
                langs: ["en"],
                reply: {
                  parent: {
                    cid: post?.post.cid ?? "",
                    uri: post?.post.uri ?? "",
                  },
                  root: {
                    cid: post?.post.cid ?? "",
                    uri: post?.post.uri ?? "",
                  },
                },
              });
              refetch();
              setShowEditor(undefined);
            }
          }}
        >
          <span class="comments-reply-editor-text-length">
            {editorText().length} / 300
          </span>
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
