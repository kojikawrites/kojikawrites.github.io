import GalleryImage from "../../components/gallery/GalleryImage.astro";
// import GalleryVideo from "../../components/gallery/GalleryVideo.astro";
import LightboxGallery from "../../components/gallery/LightboxGallery.astro";
import LightboxImage from "../../components/gallery/LightboxImage.astro";
import LightboxVideo from "../../components/gallery/LightboxVideo.astro";
import ContentWarning from "../../components/posts/ContentWarning.astro";
import FormattedDate from "../../components/FormattedDate.astro";
import HiiveLabs from "../../components/custom/hiivelabs/HiiveLabs.astro";
import EmbeddedYouTube from "../../components/EmbeddedYouTube.astro";
export const components = {
    GalleryImage,
    // GalleryVideo,
    LightboxGallery,
    LightboxImage,
    LightboxVideo,
    ContentWarning,
    FormattedDate,
    EmbeddedYouTube,
    HiiveLabsText: HiiveLabs
};
