import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
    return function (tree, { data }) {
        const textOnPage = toString(tree);

        const readingTime = getReadingTime(textOnPage);
        // readingTime.text will give us minutes read as a friendly string,
        // i.e. "3 min read"
        const timeUnit = readingTime.minutes < 2 ? ' minute' : ' minutes';
        data.astro.frontmatter.readingTime = readingTime.minutes + timeUnit;
    };
}
