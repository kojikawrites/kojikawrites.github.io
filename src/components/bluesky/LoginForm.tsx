import type { AtpAgent } from "@atproto/api";
import {type Accessor, type Component, createSignal} from "solid-js";
import { Button } from "./Button";
import { Input } from "./Input";

interface LoginFormProps {
  agent: Accessor<AtpAgent | undefined>;
  handle: string;
  atprotoURI: string;
}

export const LoginForm: Component<LoginFormProps> = ({
  agent,
  handle,
  atprotoURI,
}) => {
  const postId = atprotoURI.split("/").pop();
  const [error, setError] = createSignal<string>();
  const [loginProvided, setLoginProvided] = createSignal<boolean>();
  const [passwordProvided, setPasswordProvided] = createSignal<boolean>();

  return (
    <div class="flex flex-col items-center justify-center">
      <p class="comments-login-info">
        Login or go to{" "}
        <a href={`https://bsky.app/profile/${handle}/post/${postId}`}>
          Bsky.app
        </a>{" "}
        to comment.
      </p>
      <form
        class="flex flex-col items-center justify-center w-full gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          // console.log("Logging in");
          const formData = new FormData(e.currentTarget);
          const handle = formData.get("handle");
          const password = formData.get("password");
          if (handle && password) {
              // console.warn('here', agent);
              try {
                  const _ = await agent()?.login({
                      identifier: handle.toString(),
                      password: password.toString(),
                  });
                  // console.warn('response', response);
              }
              catch(err) {
                  // console.warn(err);
                  setError(err.toString());
              }
          }
        }}
      >
        {/* Insert nice looking input */}

        <label class="flex flex-col" for="handle">
            <div class="comments-login-input-label">Handle:</div>
            <div class="flex flex-row">
                <div class="comments-login-input-decorator">
                    <svg fill="none" viewBox="0 0 24 24" width="20" height="20"
                         style="pointer-events: none; flex-shrink: 0;">
                        <path fill="hsl(211, 20%, 56%)" fill-rule="evenodd" clip-rule="evenodd"
                              d="M12 4a8 8 0 1 0 4.21 14.804 1 1 0 0 1 1.054 1.7A9.96 9.96 0 0 1 12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10c0 1.104-.27 2.31-.949 3.243-.716.984-1.849 1.6-3.331 1.465a4.2 4.2 0 0 1-2.93-1.585c-.94 1.21-2.388 1.94-3.985 1.715-2.53-.356-4.04-2.91-3.682-5.458s2.514-4.586 5.044-4.23c.905.127 1.68.536 2.286 1.126a1 1 0 0 1 1.964.368l-.515 3.545v.002a2.22 2.22 0 0 0 1.999 2.526c.75.068 1.212-.21 1.533-.65.358-.493.566-1.245.566-2.067a8 8 0 0 0-8-8Zm-.112 5.13c-1.195-.168-2.544.819-2.784 2.529s.784 3.03 1.98 3.198 2.543-.819 2.784-2.529-.784-3.03-1.98-3.198Z"></path>
                    </svg>
                </div>
                <Input name="handle" type="text"
                       onInput={(e) => {
                           setLoginProvided(e.currentTarget.value?.length > 0);
                           setError(undefined);
                       }}
                       placeholder="handle.bsky.social"/>
            </div>
        </label>

          <label class="flex flex-col" for="password">
              <div class="comments-login-input-label">App password:</div>
              <div class="flex flex-row">
                  <div class="comments-login-input-decorator">
                      <svg fill="none" viewBox="0 0 24 24" width="20" height="20"
                           style="pointer-events: none; flex-shrink: 0;">
                          <path fill="hsl(211, 20%, 56%)" fill-rule="evenodd" clip-rule="evenodd"
                                d="M7 7a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1V7Zm-1 4v9h12v-9H6Zm9-2H9V7a3 3 0 1 1 6 0v2Zm-3 4a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1Z"></path>
                      </svg>
                  </div>
                  <Input name="password" type="password"
                         onInput={(e) =>
                         {
                             setPasswordProvided(e.currentTarget.value?.length > 0)
                             setError(undefined);
                         }}
                  />
              </div>
              <div class="comments-login-error">{error()}</div>
          </label>

          <Button type="submit" class="comments-login-button"
                  disabled={!(loginProvided() && passwordProvided())}
                  >Login</Button>
      </form>
    </div>
  );
};
