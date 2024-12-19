import { render } from 'solid-js/web';
import { type Component, createEffect, createSignal, onMount } from "solid-js";
import { type AtpSessionData, AtpAgent } from "@atproto/api";

// import "solid-devtools";

import { Header } from "./Header";
import { LoginForm } from "./LoginForm";
import { Thread } from "./Thread";

interface CommentsProps {
  atprotoURI: string;
  handle: string;
  categories: string[];
}

export const Comments: Component<CommentsProps> = ({ atprotoURI, handle, categories }) => {
  const [session, setSession] = createSignal<AtpSessionData>();
  const [agent, setAgent] = createSignal<AtpAgent>();

  function newAgent(): AtpAgent {
    return new AtpAgent({
      service: "https://bsky.social",
      persistSession: (_, session) => {
        if (session) {
          localStorage.setItem("atpSession", JSON.stringify(session));
        }
        setSession(session);
      },
    });
  }

  onMount(() => {
    const session = localStorage.getItem("atpSession");
    const agent = newAgent();
    setAgent(agent);

    if (session) {
      agent.resumeSession(JSON.parse(session));
    }
  });

  createEffect(() => {
    if (agent() === undefined) {
      localStorage.removeItem("atpSession");
    }
  });

  return (
    <div class="comments">
      <Header
        agent={agent}
        session={session}
        signOut={async () => {
          if (agent()) {
            try {
              await agent()?.logout();
              setSession(undefined);
              localStorage.removeItem("atpSession");
              setAgent(newAgent());
            }
            catch (e) {
            }
          }
        }}
      />
      <main>
        {!session() ? (
          // User is not logged in, show login form
          <LoginForm agent={agent} handle={handle} atprotoURI={atprotoURI} />
        ) : null}
        {session() ? (
          <Thread agent={agent} atprotoURI={atprotoURI} handle={handle} categories={categories} />
        ) : null}
      </main>
    </div>
  );
};

export function initializeComments(element: HTMLElement, props: CommentsProps) {
  render(() => <Comments {...props} />, element);
}
