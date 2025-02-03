import GalleryEntry from "../../components/gallery/GalleryEntry.astro";
import LightboxGallery from "../../components/gallery/LightboxGallery.astro";
import LightboxImage from "../../components/gallery/LightboxImage.astro";
import ContentWarning from "../../components/posts/ContentWarning.astro";
import FormattedDate from "../../components/FormattedDate.astro";
import HiiveLabs from "../../components/custom/hiivelabs/HiiveLabs.astro";
import SteamLink from "../../components/links/SteamLink.astro";
import WikiLink from "../../components/links/WikiLink.astro";
import BlueskyLink from "../../components/links/BlueskyLink.astro";
import GithubLink from "../../components/links/GithubLink.astro";

export const components = {
    GalleryEntry,
    LightboxGallery,
    LightboxImage,
    ContentWarning,
    FormattedDate,
    SteamLink,
    WikiLink,
    BlueskyLink,
    GithubLink,
    HiiveLabsText: HiiveLabs
};
