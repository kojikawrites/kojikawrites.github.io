import GalleryEntry from "../../components/gallery/GalleryEntry.astro";
import LightboxGallery from "../../components/gallery/LightboxGallery.astro";
import LightboxImage from "../../components/gallery/LightboxImage.astro";
import ContentWarning from "../../components/posts/ContentWarning.astro";
import FormattedDate from "../../components/FormattedDate.astro";
import HiiveLabs from "../../components/custom/hiivelabs/HiiveLabs.astro";

export const components = {
    GalleryEntry,
    LightboxGallery,
    LightboxImage,
    ContentWarning,
    FormattedDate,
    HiiveLabsText: HiiveLabs
};
