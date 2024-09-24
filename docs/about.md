---
layout: page
title: About
#showTitle: false
permalink: /about/
---

{% capture content%}
## Kojika

Kojika is an aspiring writer and game designer with a passion for creating inclusive and accessible experiences. 

Her keen interest in accessibility drives her to develop games and stories that are enjoyable and engaging for all 
audiences, regardless of their abilities. She continually seeks to broaden her knowledge and skills in the industry, 
staying updated on the latest accessibility practices and innovations. Being that she is both blind and hard of hearing, Kojika's dedication to inclusivity not 
only enhances her creative projects but also contributes to making the world of gaming and literature more 
welcoming and accommodating for everyone. 

Through her work, Kojika is on a journey to make storytelling and game design more inclusive for all.

Kojika is an obligate homebody who prefers spending time with her husband, her kids and their four cats.

Her favorite books include Stephen King's Needful Things and Mark Tufo's Zombie Fallout and Indian Hill series. Her favorite television shows include The Walking Dead, Game of Thrones, GRIMM, and The 100. Her favorite films inculde Battle Royale, Oldboy, Sympathy for Mr. Vengence, A Tale of Two Sisters and the Death Note series.

Kojika is currently working on a children's book, a series of Middle Grade history books for Scholastic and multiple mixed genre manuscripts. She hopes to publish something by Q3 of 2025.

{% endcapture %}
{% assign imagePath = "/assets/images/kojika.png" | relative_url %}
{% include about-resume-person.liquid imagePath=imagePath content=content altText="Kojikas avatar" %}

{% assign imagePath = "/assets/images/kojika-signature.png" | relative_url %}
{% include post-image.liquid imagePath=imagePath content=content altText="FAWN Engine Logo" %}


