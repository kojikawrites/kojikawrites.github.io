---
layout: page
showTitle: false
---

## Posts By Category

The following categories appear on this site:

[ {% for cat in site.categories %}
{% if forloop.first == false %} | {% endif -%}
<span><a href="#{{ cat[0] | slugify }}">{{ cat[0] }}</a></span>
{%- endfor %} ]
<hr/>

{% for category in site.categories %}
{% assign cat = category[0] %}

<div id="{{ cat | slugify }}" class="category-div">
<h3 name="{{ cat | slugify }}">{{ cat }}</h3>

<ul>
{% for post in site.categories[cat] %}
  <li><a href="{{ post.url }}">{{ post.title }}</a><br/>
    {{ post.excerpt }}
  </li>
{% endfor %}
</ul>

</div>

{% endfor %}

