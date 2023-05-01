---
layout: page
title: About
showTitle: false
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
