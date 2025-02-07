import GalleryImage from "../../components/gallery/GalleryImage.astro";
// import GalleryVideo from "../../components/gallery/GalleryVideo.astro";
import LightboxGallery from "../../components/gallery/LightboxGallery.astro";
import LightboxImage from "../../components/gallery/LightboxImage.astro";
import LightboxVideo from "../../components/gallery/LightboxVideo.astro";
import ContentWarning from "../../components/posts/ContentWarning.astro";
import FormattedDate from "../../components/FormattedDate.astro";
import HiiveLabs from "../../components/custom/hiivelabs/HiiveLabs.astro";
import SteamLink from "../../components/links/SteamLink.astro";
import WikiLink from "../../components/links/WikiLink.astro";
import BlueskyLink from "../../components/links/BlueskyLink.astro";
import GithubLink from "../../components/links/GithubLink.astro";
import SimpleLink from "../../components/links/SimpleLink.astro";
import FaviconLink from "../../components/links/FaviconLink.astro";
import EmbeddedYouTube from "../../components/EmbeddedYouTube.astro";
export const components = {
    GalleryImage,
    // GalleryVideo,
    LightboxGallery,
    LightboxImage,
    LightboxVideo,
    ContentWarning,
    FormattedDate,
    SteamLink,
    WikiLink,
    BlueskyLink,
    GithubLink,
    FaviconLink,
    SimpleLink,
    EmbeddedYouTube,
    HiiveLabsText: HiiveLabs
};
