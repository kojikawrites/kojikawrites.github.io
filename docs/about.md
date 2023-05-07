---
layout: page
title: About
#showTitle: false
permalink: /about/
---

{% capture content%}
## Andrew Rollings

Andrew Rollings has written several books, all connected in some way or other with his love of games. The most notable of these being Game Architecture and Design, which has been the reference for many college and secondary education courses.

Andrew is an ex-UK resident who currently lives in a bunker located in places unknown. He earns his keep by architecting and developing software for companies that span a wide variety of fields. In his spare time, you may see him working on his Nintendo 3DS, Switch, or PC games.

{% endcapture %}
{% assign imagePath = "/assets/images/andrew.png" | relative_url %}
{% include about-resume-person.liquid imagePath=imagePath content=content altText="Andrew Rollings avatar" %}


<!-- ---------------------- RESUME ---------------------- -->

{% include about-resume-section-header.liquid title="Résumé" %}


{% capture content %}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Hiive, LLC" 
    title="Software Developer, Owner" 
    period="Jan 2006 - Current" 
    location="Atlanta, GA" 
    content=content %}

{% capture content %}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Ososoft, LLC" 
    title="Chief Sanitation Engineer" 
    period="Mar 2021 - Current" 
    location="Atlanta, GA" 
    content=content %}

<!-- ---------------------- EDUCATION ---------------------- -->

{% include about-resume-section-header.liquid title="Education" %}


{% capture content %}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Devry Institute" 
    title="BS in Computer Science" 
    period="Sep 2006 - May 2009" 
    location="Auburn, AL" 
    content=content %}


{% capture content %}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Arizona State University" 
    title="MS in Computer Science" 
    period="Sep 2020 - May 2022" 
    location="Flagstaff, AZ" 
    content=content %}


<!-- ---------------------- PUBLICATIONS ---------------------- -->

{% include about-resume-section-header.liquid title="Publications" %}


{% capture content %}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Game Architecure and Design" 
    title="New Riders Pub" 
    period="Oct 2003" 
    location="765 pages" 
    content=content %}


{% capture content %}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Dogma Sutra" 
    title="Self-Published" 
    period="Sep 2020" 
    location="230 pages" 
    content=content %}


<!-- ---------------------- CERTIFICATIONS ---------------------- -->

{% include about-resume-section-header.liquid title="Certifications" %}


{% capture content %}

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Secret Clearance" 
    title="" 
    period="Oct 2018 - Oct 2028" 
    location="" 
    content=content %}


<!-- ---------------------- Special Thanks ---------------------- -->

{% include about-resume-section-header.liquid title="Special Thanks" %}


{% capture content %}

Most of the icons on this site are works derived from assets found on The Noun Project. Their core belief is that visual language has the power to change the world. If you're looking for visual assets to represent the most generic or specific of concepts, visit their site. You'll find tons of high-quality icons and images for just about any topic.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Noun Project" 
    title="" 
    period="" 
    location="<a href='https://thenounproject.com/'>thenounproject.com</a>" 
    content=content %}

{% capture content %}

This content is hosted on GitHub Pages. They make it easy to create and host websites for you and your projects. Your content is hosted directly from your GitHub repository. Just edit, push, and your changes are live. It couldn't be easier.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="GitHub Pages" 
    title="" 
    period="" 
    location="<a href='https://pages.github.com/'>pages.github.com</a>" 
    content=content %}

{% capture content %}

At its core, this content is powered by Jekyll &mdash; a tool that allows you to transform your plain text into static websites and blogs. You work in [GitHub-flavored Markdown (GFM)](https://github.github.com/gfm/) and Jekyll spits out the templated HTML that your site's visitors see.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Jekyll" 
    title="" 
    period="" 
    location="<a href='https://jekyllrb.com/'>jekyllrb.com</a>" 
    content=content %}

{% capture content %}

Jekyll is great at managing blogs and static pages, but sometimes you want a little more interaction, or you want to present content other than a blog post or landing page. That's where JekyllFaces comes in. It provides GitHub-Pages-friendly extensions to make managing content for your projects easier to promote and manage. **NOTE:** _This site uses a pre-release version of JekyllFaces since it's not quite ready for general use._

{% endcapture %}
{% include about-resume-item.liquid 
    employer="JekyllFaces" 
    title="" 
    period="" 
    location="<a href='http://jekyllfaces.com/'>jekyllfaces.com</a>" 
    content=content %}

{% capture content %}

Most of the initial content for this site was generated using Chat GPT-3. That initial text has long since been tweaked during a line-by-line review of the generated blurbs, but Chat GPT-3 is worth a mention since it serves as an expert in so many topics. The output makes for a great head start for your project, and the system is great for bouncing creative ideas around, or when trying to solve issues when you get a little stuck.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Chat GPT-3" 
    title="" 
    period="" 
    location="<a href='https://chat.openai.com/'>chat.openai.com</a>" 
    content=content %}

