import GalleryImage from "../../components/gallery/GalleryImage.astro";
// import GalleryVideo from "../../components/gallery/GalleryVideo.astro";
import LightboxGallery from "../../components/gallery/LightboxGallery.astro";
import LightboxImage from "../../components/gallery/LightboxImage.astro";
import LightboxVideo from "../../components/gallery/LightboxVideo.astro";
import ContentWarning from "../../components/posts/ContentWarning.astro";
import FormattedDate from "../../components/FormattedDate.astro";
import EmbeddedYouTube from "../../components/EmbeddedYouTube.astro";
import EquationSnippet from "../../components/EquationSnippet.astro";
import Timeline from "../../components/timeline/Timeline.astro";
import TimelineEntry from "../../components/timeline/TimelineEntry.astro";
import InlineSpan from "../../components/InlineSpan.astro";
import Biography from "../../components/about/Biography.astro";
import Thanks from "../../components/about/Thanks.astro";
import MainLogo from "../../components/MainLogo.astro";
import ThemedImage from "../../components/ThemedImage.astro";
import FootnoteRef from "../../components/footnote/FootnoteRef.astro";
import FootnoteDefinition from "../../components/footnote/FootnoteDefinition.astro";
import HiiveLabs from "../../components/custom/hiivelabs/HiiveLabs.astro";

export const components = {
    GalleryImage,
    // GalleryVideo,
    LightboxGallery,
    LightboxImage,
    LightboxVideo,
    ContentWarning,
    FormattedDate,
    EmbeddedYouTube,
    EquationSnippet,
    Timeline,
    TimelineEntry,
    InlineSpan,
    Biography,
    Thanks,
    MainLogo,
    ThemedImage,
    FootnoteRef,
    FootnoteDefinition,
    HiiveLabsText: HiiveLabs,
};
