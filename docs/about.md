---
layout: page
title: About
#showTitle: false
permalink: /about/
---

{% capture content%}
## Andrew Rollings

Andrew Rollings has written several books, all connected in some way or other with his love of games. The most notable 
of these being Game Architecture and Design, which has been the reference for many college and secondary education 
courses.

Andrew is an ex-UK resident who currently lives in a bunker located in places unknown. He earns his keep by architecting
and developing software for companies that span a wide variety of fields. In his spare time, you may see him working on 
his Nintendo 3DS, Switch, or PC games.

Note that the image on the left is not what Andrew actually looks like. However it is what AI thinks he looks like based
on a text description. He'll take it.

{% endcapture %}
{% assign imagePath = "/assets/images/andrew.png" | relative_url %}
{% include about-resume-person.liquid imagePath=imagePath content=content altText="Andrew Rollings avatar" %}

{% capture content%}
## Fawn Rollings

Fawn Rollings is an aspiring writer and game designer with a passion for creating inclusive and accessible experiences. 
Her keen interest in accessibility drives her to develop games and stories that are enjoyable and engaging for all 
audiences, regardless of their abilities. Fawn continually seeks to broaden her knowledge and skills in the industry, 
staying updated on the latest accessibility practices and innovations. Her dedication to inclusivity not only 
enhances her creative projects but also contributes to making the world of gaming and literature more welcoming 
and accommodating for everyone. 

Her avatar is far closer to her real-life appearance than Andrew's. He'll take it.

{% endcapture %}
{% assign imagePath = "/assets/images/fawn.png" | relative_url %}
{% include about-resume-person.liquid imagePath=imagePath content=content altText="Fawn Rollings avatar" %}



<!-- ---------------------- Special Thanks ---------------------- -->
{% include about-resume-section-header.liquid title="<br/>Special Thanks" %}


{% capture content %}

Most of the icons on this site are works derived from assets found on The Noun Project. Their core belief is that 
visual language has the power to change the world. If you're looking for visual assets to represent the most generic or 
specific of concepts, visit their site. You'll find tons of high-quality icons and images for just about any topic.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Noun Project" 
    title="" 
    period="" 
    location="<a href='https://thenounproject.com/'>thenounproject.com</a>" 
    content=content %}

{% capture content %}

This content is hosted on GitHub Pages. They make it easy to create and host websites for you and your projects. 
Your content is hosted directly from your GitHub repository. Just edit, push, and your changes are live. 
It couldn't be easier.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="GitHub Pages" 
    title="" 
    period="" 
    location="<a href='https://pages.github.com/'>pages.github.com</a>" 
    content=content %}

{% capture content %}

At its core, this content is powered by Jekyll &mdash; a tool that allows you to transform your plain text into static 
websites and blogs. You work in [GitHub-flavored Markdown (GFM)](https://github.github.com/gfm/) and Jekyll spits out 
the templated HTML that your site's visitors see.

{% endcapture %}
{% include about-resume-item.liquid 
    employer="Jekyll" 
    title="" 
    period="" 
    location="<a href='https://jekyllrb.com/'>jekyllrb.com</a>" 
    content=content %}

{% capture content %}

Jekyll is great at managing blogs and static pages, but sometimes you want a little more interaction, or you want to 
present content other than a blog post or landing page. That's where JekyllFaces comes in. It provides 
GitHub-Pages-friendly extensions to make managing content for your projects easier to promote and manage. 
**NOTE:** _This site uses a pre-release version of JekyllFaces since it's not quite ready for general use._

{% endcapture %}
{% include about-resume-item.liquid 
    employer="JekyllFaces" 
    title="" 
    period="" 
    location="<a href='http://jekyllfaces.com/'>jekyllfaces.com</a>" 
    content=content %}


{% capture content %}

Joseph Hall is responsible for the design and layout of this site. He also wrote the underlying JekyllFaces 
implementation that this site uses.

{% endcapture %}
{% include about-resume-item.liquid
employer="Joseph B. Hall"
title=""
period=""
location="<a href='http://joehall.net/'>joehall.net</a>"
content=content %}

