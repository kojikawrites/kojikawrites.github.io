import type { AtpSessionData, AtpAgent } from "@atproto/api";
import type { ProfileViewDetailed } from "@atproto/api/dist/client/types/app/bsky/actor/defs";

import {
  type Accessor,
  type Component,
  createResource,
  Show,
  createUniqueId,
} from "solid-js";

interface HeaderProps {
  agent: Accessor<AtpAgent | undefined>;
  session: Accessor<AtpSessionData | undefined>;
  signOut: () => void;
}

// Profile popover using native Popover API
const ProfilePopover: Component<{
  profile: ProfileViewDetailed;
  signOut: () => void;
}> = ({ profile, signOut }) => {
  const popoverId = createUniqueId();
  let triggerRef: HTMLButtonElement | undefined;
  let popoverRef: HTMLDivElement | undefined;

  // Position the popover near the trigger when it opens
  const positionPopover = () => {
    if (triggerRef && popoverRef) {
      const triggerRect = triggerRef.getBoundingClientRect();
      // Position below and aligned to the right of the trigger
      // Use absolute positioning so it moves with the page scroll
      popoverRef.style.position = 'absolute';
      popoverRef.style.top = `${triggerRect.bottom + window.scrollY + 8}px`;
      popoverRef.style.left = `${triggerRect.right + window.scrollX - popoverRef.offsetWidth}px`;
      popoverRef.style.margin = '0';
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popovertarget={popoverId}
        class="comments-popover-trigger"
        aria-label="User menu"
      >
        <img
          class="comments-popover-avatar"
          src={profile.avatar}
          alt="avatar"
        />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        class="comments-popover-content"
        onToggle={(e) => {
          const target = e.currentTarget as HTMLElement & { matches: (selector: string) => boolean };
          if (target.matches(':popover-open')) {
            popoverRef!.style.display = '';
            positionPopover();
          } else {
            popoverRef!.style.display = 'none';
          }
        }}
      >
        <span class="comments-popover-display-name">{profile.displayName}</span>
        <button
          type="button"
          onClick={(e) => {
            signOut();
            // Close the popover after signing out
            const popoverEl = e.currentTarget.closest('[popover]') as HTMLElement & { hidePopover?: () => void };
            popoverEl?.hidePopover?.();
          }}
          class="comments-popover-button"
        >
          Sign out
        </button>
      </div>
    </>
  );
};

export const Header: Component<HeaderProps> = ({ agent, session, signOut }) => {
  // Use createResource for async profile fetching
  const [profile] = createResource(
    () => agent()?.session?.handle, // Source: re-fetch when handle changes
    async (handle) => {
      if (agent() && handle) {
        try {
          const response = await agent()?.getProfile({ actor: handle });
          if (response?.success) {
            return response.data;
          } else {
            return undefined;
          }
        } catch (error) {
          return undefined;
        }
      }
      return undefined;
    }
  );

  return (
    <header class="comments-header">
      <h2>Comments</h2>
      <div>
        <Show when={profile()}>
          {(loadedProfile) => (
            <ProfilePopover profile={loadedProfile()} signOut={signOut} />
          )}
        </Show>
      </div>
    </header>
  );
};
