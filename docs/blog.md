---
layout: default
---

## Recent Posts

{% assign maxCount = 5 %}
{% assign postCount = site.posts | size %}
{% if postCount > maxCount %}
  The most recent {{ maxCount }} posts are listed below. To view the complete archive of {{ postCount }} posts, [click here]({{ "/blog-archive" | relative_url }}).
{% elsif postCount == 0 %}
  Uh oh! There are no posts.
{% elsif postCount <= maxCount %}
  {% if postCount > 1 %}All {{ postCount }} posts are{% else %}The only post is{% endif %} listed below.
{% endif %}


<ul class="post-list">
{% for post in site.posts limit: maxCount %}
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
