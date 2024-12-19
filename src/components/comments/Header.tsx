import type { AtpSessionData, AtpAgent } from "@atproto/api";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
import { Popover } from "@kobalte/core/popover";
import {
  createSignal,
  type Accessor,
  type Component,
  createEffect,
} from "solid-js";

interface HeaderProps {
  agent: Accessor<AtpAgent | undefined>;
  session: Accessor<AtpSessionData | undefined>;
  signOut: () => void;
}

export const Header: Component<HeaderProps> = ({ agent, session, signOut }) => {
  const [profile, setProfile] = createSignal<ProfileViewDetailed>();
  createEffect(async () => {
    if (agent() && session()) {
      const profile = await agent()?.getProfile({
        actor: agent()?.session?.handle ?? "",
      });
      profile?.success && setProfile(profile.data);
    } else {
      setProfile(undefined);
    }
  });

  // @ts-ignore
  return (
    <header class="comments-header">
      <h2>Comments</h2>
      <div>
        {profile()?.avatar ?
        <Popover>
          <Popover.Anchor>
            <Popover.Trigger class="comments-popover-trigger">
                  <img
                    class="comments-popover-avatar"
                    src={profile()?.avatar}
                    alt="avatar"
                  />
            </Popover.Trigger>
          </Popover.Anchor>
          <Popover.Content
            class='comments-popover-content'>
            <span class="comments-popover-display-name">{profile()?.displayName}</span>
            <button type="button" onClick={signOut} class="comments-popover-button">
              Sign out
            </button>
          </Popover.Content>
        </Popover>
            : null
        }
      </div>
    </header>
  );
};
