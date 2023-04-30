---
layout: default
---

## Post Archive

{% assign postCount = site.posts | size %}
All {{ postCount }} posts are listed below.


<ul class="post-list">
{% for post in site.posts %}
  <li>
    {% assign date_format = site.minima.date_format | default: "%b %-d, %Y" %}
    <span class="post-meta">{{ post.date | date: date_format }}</span> &mdash;
    <span><strong>{{ post.title | escape }}</strong></span>
    <p>{{ post.excerpt | strip_html }}<br/>
    <a class="post-link" href="{{ post.url | relative_url }}">Read More &raquo;</a></p>
  </li>
{% endfor %}
</ul>

<p class="rss-subscribe">You can subscribe to receive new posts <a href='{{ "/feed.xml" | relative_url }}'>via RSS</a>.</p>
