import type { Component, JSX } from "solid-js";
import vsCommentSvg from "../../assets/images/bluesky/vs-comment.svg?raw";
import vsEmptyHeartSvg from "../../assets/images/bluesky/vs-empty-heart.svg?raw";
import vsFilledHeartSvg from "../../assets/images/bluesky/vs-filled-heart.svg?raw";
import vsLinkSvg from "../../assets/images/bluesky/vs-link.svg?raw";
import blueskyLinkSvg from "../../assets/images/bluesky/bluesky.svg?raw";
import externalLinkSvg from "../../assets/images/links/-external-link.svg?raw";

type IconProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const VsComment: Component<IconProps> = (props) => (
  <span innerHTML={vsCommentSvg} style={{ "pointer-events": "none", display: "inline-block" }} {...props} />
);

export const VsEmptyHeart: Component<IconProps> = (props) => (
  <span innerHTML={vsEmptyHeartSvg} style={{ "pointer-events": "none", display: "inline-block" }} {...props} />
);

export const VsFilledHeart: Component<IconProps> = (props) => (
  <span innerHTML={vsFilledHeartSvg} style={{ "pointer-events": "none", display: "inline-block" }} {...props} />
);

export const VsLink: Component<IconProps> = (props) => (
  <span innerHTML={vsLinkSvg} style={{ "pointer-events": "none", display: "inline-block" }} {...props} />
);

export const BlueskyLink: Component<IconProps> = (props) => (
    <span innerHTML={blueskyLinkSvg} style={{ "pointer-events": "none", display: "inline-block" }} {...props} />
);

export const ExternalLink: Component<IconProps> = (props) => (
    <span innerHTML={externalLinkSvg} style={{ "pointer-events": "none", display: "inline-block" }} {...props} />
);

