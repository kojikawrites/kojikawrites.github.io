---
layout: page
showTitle: false
---

## Recent Posts

{% assign maxCount = 10 %}
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
    <span class="post-list-title">{{ post.title | escape }}</span><br/>
    <span class="post-meta">{{ post.date | date: date_format }}</span>
    <p>{{ post.excerpt | strip_html }}<br/>
    <a class="post-link" href="{{ post.url | relative_url }}">Read More &raquo;</a></p>
    <br/>
  </li>
{% endfor %}
</ul>

<p class="rss-subscribe">You can subscribe to receive new posts <a href='{{ "/feed.xml" | relative_url }}'>via RSS</a>.</p>

<hr/>

# All Tags Demo

{% for tag in site.tags %}
{% assign t = tag[0] %}
* {{ tag[0] }}
  {% for post in site.tags[t] %}
    * {{ post.title }}
      {% endfor %}
      {% endfor %}

<hr/>

# All Categories Demo

{% for cat in site.categories %}
  {% assign c = cat[0] %}
  * {{ c }}
    {% for post in site.categories[c] %}
    * {{ post.title }}
    {% endfor %}
{% endfor %}

<hr/>

