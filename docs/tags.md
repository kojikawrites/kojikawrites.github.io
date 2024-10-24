---
layout: page
showTitle: false
---

## Posts By Tag

The following tags appear on this site:

{% for tag in site.tags %}
  <span class="tag-wrapper"><a class="tag" href="#{{ tag[0] | slugify }}">#{{ tag[0] }}</a></span>
{%- endfor %}
<hr/>

{% for tg in site.tags %}
{% assign tag = tg[0] %}

<div id="{{ tag | slugify }}" class="tag-div">
<h3 name="{{ tag | slugify }}">#{{ tag }}</h3>

<ul>
{% for post in site.tags[tag] %}
  <li><a href="{{ post.url }}">{{ post.title }}</a><br/>
    {{ post.excerpt }}
  </li>
{% endfor %}
</ul>

</div>

{% endfor %}

